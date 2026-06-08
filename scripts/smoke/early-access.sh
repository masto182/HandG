#!/usr/bin/env bash
# scripts/smoke/early-access.sh
# Tests the early-access cart gate (enforce-access-on-cart-add middleware).
#
# Time compression: sets early_access_until = now+2h so that:
#   - VIP5 window opened 22h ago → ALLOWED immediately (no waiting)
#   - Approved window opens in 1h → BLOCKED immediately (no waiting)
#
# Required env:
#   MEDUSA_PUBLISHABLE_KEY
#   CUSTOMER_JWT     approved-tier Bearer token
#   VIP5_JWT         VIP5 Bearer token
#   TEST_PRODUCT_ID  a published product with at least one variant
#
# Optional:
#   MEDUSA_BACKEND_URL       default: http://localhost:9000
#   ADMIN_EMAIL / ADMIN_PASSWORD

set -euo pipefail
source "$(dirname "$0")/helpers.sh"

: "${MEDUSA_PUBLISHABLE_KEY:?MEDUSA_PUBLISHABLE_KEY is required}"
: "${CUSTOMER_JWT:?CUSTOMER_JWT (approved tier) is required}"
: "${VIP5_JWT:?VIP5_JWT is required}"
: "${TEST_PRODUCT_ID:?TEST_PRODUCT_ID is required}"

PK="$MEDUSA_PUBLISHABLE_KEY"

echo ""
echo "=== Early Access Gate Smoke Test ==="
echo "Product: $TEST_PRODUCT_ID"
echo ""

# ── Auth ──────────────────────────────────────────────────────────────────────
echo "-- Admin auth"
ADMIN_JWT=$(admin_token)
if [ -z "$ADMIN_JWT" ]; then
  echo "  FAIL  admin auth — could not obtain token"
  exit 1
fi
echo "  admin token acquired"

# ── Get first variant of test product ─────────────────────────────────────────
echo ""
echo "-- Fetching test product variant"
raw=$(curl_req GET "/store/products/$TEST_PRODUCT_ID" \
  -H "x-publishable-api-key: $PK" \
  -H "Authorization: Bearer $CUSTOMER_JWT")
split_response "$raw"
assert_status "fetch product" "200" "$HTTP_CODE" "$BODY"
VARIANT_ID=$(echo "$BODY" | jq -r '.product.variants[0].id // empty')
if [ -z "$VARIANT_ID" ]; then
  echo "  FAIL  no variant found on product $TEST_PRODUCT_ID"
  exit 1
fi
echo "  Variant: $VARIANT_ID"

# ── Get a region for cart creation ────────────────────────────────────────────
echo ""
echo "-- Fetching region"
raw=$(curl_req GET "/store/regions" -H "x-publishable-api-key: $PK")
split_response "$raw"
REGION_ID=$(echo "$BODY" | jq -r '.regions[0].id // empty')
if [ -z "$REGION_ID" ]; then
  echo "  FAIL  no regions found — check seed data"
  exit 1
fi
echo "  Region: $REGION_ID"

# ── Helper: create a fresh cart ───────────────────────────────────────────────
create_cart() {
  local jwt="$1"
  curl -s -X POST "$BASE/store/carts" \
    -H "Authorization: Bearer $jwt" \
    -H "x-publishable-api-key: $PK" \
    -H "Content-Type: application/json" \
    -d "{\"region_id\":\"$REGION_ID\"}" \
    | jq -r '.cart.id // empty'
}

# ── Step 1: Set early_access_until = now+2h on the product ───────────────────
echo ""
echo "-- Setting early_access_until = now+2h"
EA_UNTIL=$(date_plus_hours 2)
raw=$(curl_req PATCH "/admin/products/$TEST_PRODUCT_ID" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"metadata\":{\"early_access_until\":\"$EA_UNTIL\"}}")
split_response "$raw"
assert_status "PATCH early_access_until" "200" "$HTTP_CODE" "$BODY"
echo "  early_access_until = $EA_UNTIL"

# ── Step 2: Approved customer tries to add → 409 ─────────────────────────────
echo ""
echo "-- Approved customer: add to cart → expect 409"
APPROVED_CART=$(create_cart "$CUSTOMER_JWT")
if [ -z "$APPROVED_CART" ]; then
  echo "  FAIL  could not create cart for approved customer"
  FAIL=$((FAIL + 1))
else
  echo "  Cart: $APPROVED_CART"
  raw=$(curl_req POST "/store/carts/$APPROVED_CART/line-items" \
    -H "Authorization: Bearer $CUSTOMER_JWT" \
    -H "x-publishable-api-key: $PK" \
    -H "Content-Type: application/json" \
    -d "{\"variant_id\":\"$VARIANT_ID\",\"quantity\":1}")
  split_response "$raw"
  assert_status "approved → 409 blocked" "409" "$HTTP_CODE" "$BODY"
  assert_json "error code = access_not_yet_available" '.error' "access_not_yet_available" "$BODY"
  assert_json "your_tier = approved" '.your_tier' "approved" "$BODY"
fi

# ── Step 3: VIP5 customer tries same add → 201 ───────────────────────────────
echo ""
echo "-- VIP5 customer: add to cart → expect 201"
VIP5_CART=$(create_cart "$VIP5_JWT")
if [ -z "$VIP5_CART" ]; then
  echo "  FAIL  could not create cart for VIP5 customer"
  FAIL=$((FAIL + 1))
else
  echo "  Cart: $VIP5_CART"
  raw=$(curl_req POST "/store/carts/$VIP5_CART/line-items" \
    -H "Authorization: Bearer $VIP5_JWT" \
    -H "x-publishable-api-key: $PK" \
    -H "Content-Type: application/json" \
    -d "{\"variant_id\":\"$VARIANT_ID\",\"quantity\":1}")
  split_response "$raw"
  assert_status "vip5 → 201 allowed" "201" "$HTTP_CODE" "$BODY"
fi

# ── Step 4: Remove the gate → approved can now add ───────────────────────────
echo ""
echo "-- Lifting gate: early_access_until = 2020-01-01 (past)"
raw=$(curl_req PATCH "/admin/products/$TEST_PRODUCT_ID" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"metadata":{"early_access_until":"2020-01-01T00:00:00Z"}}')
split_response "$raw"
assert_status "PATCH early_access_until to past" "200" "$HTTP_CODE" "$BODY"

echo ""
echo "-- Approved customer: add to cart after gate lifted → expect 201"
APPROVED_CART2=$(create_cart "$CUSTOMER_JWT")
if [ -z "$APPROVED_CART2" ]; then
  echo "  FAIL  could not create cart"
  FAIL=$((FAIL + 1))
else
  raw=$(curl_req POST "/store/carts/$APPROVED_CART2/line-items" \
    -H "Authorization: Bearer $CUSTOMER_JWT" \
    -H "x-publishable-api-key: $PK" \
    -H "Content-Type: application/json" \
    -d "{\"variant_id\":\"$VARIANT_ID\",\"quantity\":1}")
  split_response "$raw"
  assert_status "approved → 201 after gate lifted" "201" "$HTTP_CODE" "$BODY"
fi

# ── Step 5: Product with no early_access_until → always passes ───────────────
echo ""
echo "-- Removing early_access_until entirely → gate should not fire"
raw=$(curl_req PATCH "/admin/products/$TEST_PRODUCT_ID" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"metadata":{"early_access_until":null}}')
split_response "$raw"
assert_status "PATCH remove early_access_until" "200" "$HTTP_CODE" "$BODY"

APPROVED_CART3=$(create_cart "$CUSTOMER_JWT")
if [ -n "$APPROVED_CART3" ]; then
  raw=$(curl_req POST "/store/carts/$APPROVED_CART3/line-items" \
    -H "Authorization: Bearer $CUSTOMER_JWT" \
    -H "x-publishable-api-key: $PK" \
    -H "Content-Type: application/json" \
    -d "{\"variant_id\":\"$VARIANT_ID\",\"quantity\":1}")
  split_response "$raw"
  assert_status "no gate → 201 always" "201" "$HTTP_CODE" "$BODY"
fi

summary
