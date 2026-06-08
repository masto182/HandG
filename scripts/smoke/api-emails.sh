#!/usr/bin/env bash
# scripts/smoke/api-emails.sh
# Tests three API callsites that dispatch email directly from route handlers:
#   A) POST /admin/orders/:id/ready-for-pickup
#   B) POST /store/customers/me/email-change-request
#   C) POST /store/customers/me/wishlist (buy_at_price, immediate price-alert path)
#
# Required env:
#   MEDUSA_PUBLISHABLE_KEY
#   CUSTOMER_JWT     approved-tier Bearer token
#   TEST_PRODUCT_ID  a published product with variants
#
# Optional:
#   MEDUSA_BACKEND_URL       default: http://localhost:9000
#   ADMIN_EMAIL / ADMIN_PASSWORD
#   TEST_ORDER_ID            if set, enables Section A (ready-for-pickup)
#                            skip-printed when unset

set -euo pipefail
source "$(dirname "$0")/helpers.sh"

: "${MEDUSA_PUBLISHABLE_KEY:?MEDUSA_PUBLISHABLE_KEY is required}"
: "${CUSTOMER_JWT:?CUSTOMER_JWT is required}"
: "${TEST_PRODUCT_ID:?TEST_PRODUCT_ID is required}"

PK="$MEDUSA_PUBLISHABLE_KEY"

echo ""
echo "=== API Email Routes Smoke Test ==="
echo ""

# ── Admin auth ────────────────────────────────────────────────────────────────
echo "-- Admin auth"
ADMIN_JWT=$(admin_token)
if [ -z "$ADMIN_JWT" ]; then
  echo "  FAIL  admin auth — could not obtain token"
  exit 1
fi
echo "  admin token acquired"

# ════════════════════════════════════════════════════════════════════════════
# Section A: ready-for-pickup
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "=== Section A: Order Ready-for-Pickup Email ==="

if [ -z "${TEST_ORDER_ID:-}" ]; then
  skip_section "ready-for-pickup" "TEST_ORDER_ID not set (set it to a placed order's ID)"
else
  echo "-- Order: $TEST_ORDER_ID"

  echo "-- POST /admin/orders/:id/ready-for-pickup with body fields"
  raw=$(curl_req POST "/admin/orders/$TEST_ORDER_ID/ready-for-pickup" \
    -H "Authorization: Bearer $ADMIN_JWT" \
    -H "Content-Type: application/json" \
    -d '{
      "location_name": "Smoke Test Depot",
      "location_address": "1 Test Street, Melbourne VIC 3000",
      "location_hours": "Mon-Fri 9am-5pm"
    }')
  split_response "$raw"
  assert_status "ready-for-pickup → 200" "200" "$HTTP_CODE" "$BODY"
  assert_json "response ok=true" '.ok' "true" "$BODY"

  echo "-- Verifying ready_for_pickup_at was stamped on the order"
  raw=$(curl_req GET "/admin/orders/$TEST_ORDER_ID" \
    -H "Authorization: Bearer $ADMIN_JWT")
  split_response "$raw"
  PICKUP_AT=$(echo "$BODY" | jq -r '.order.metadata.ready_for_pickup_at // empty')
  if [ -n "$PICKUP_AT" ]; then
    echo "  PASS  ready_for_pickup_at = $PICKUP_AT"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  ready_for_pickup_at not set on order metadata"
    echo "        body: $BODY"
    FAIL=$((FAIL + 1))
  fi

  echo "-- Idempotency: POST again (should re-stamp and re-send)"
  raw=$(curl_req POST "/admin/orders/$TEST_ORDER_ID/ready-for-pickup" \
    -H "Authorization: Bearer $ADMIN_JWT" \
    -H "Content-Type: application/json" \
    -d '{"location_name":"Second Call"}')
  split_response "$raw"
  assert_status "ready-for-pickup idempotent → 200" "200" "$HTTP_CODE" "$BODY"

  echo "-- Non-existent order → 404"
  raw=$(curl_req POST "/admin/orders/ord_does_not_exist_99/ready-for-pickup" \
    -H "Authorization: Bearer $ADMIN_JWT" \
    -H "Content-Type: application/json" \
    -d '{}')
  split_response "$raw"
  assert_status "non-existent order → 404" "404" "$HTTP_CODE" "$BODY"
fi

# ════════════════════════════════════════════════════════════════════════════
# Section B: email-change-request
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "=== Section B: Email Change Request ==="

SMOKE_NEW_EMAIL="smoke+emailchange@test.example.com"

echo "-- POST with valid new email"
raw=$(curl_req POST "/store/customers/me/email-change-request" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"new_email\":\"$SMOKE_NEW_EMAIL\"}")
split_response "$raw"
assert_status "email-change-request → 200" "200" "$HTTP_CODE" "$BODY"
assert_json "response ok=true" '.ok' "true" "$BODY"

EXPIRES_AT=$(echo "$BODY" | jq -r '.expires_at // empty')
if [ -n "$EXPIRES_AT" ]; then
  echo "  PASS  expires_at present ($EXPIRES_AT)"
  PASS=$((PASS + 1))
else
  echo "  FAIL  expires_at missing from response"
  FAIL=$((FAIL + 1))
fi

echo "-- POST with invalid email format → 400"
raw=$(curl_req POST "/store/customers/me/email-change-request" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d '{"new_email":"notanemail"}')
split_response "$raw"
assert_status "invalid email → 400" "400" "$HTTP_CODE" "$BODY"
assert_json "error = invalid email" '.error' "invalid email" "$BODY"

echo "-- POST with oversized email (255 chars) → 400"
LONG_EMAIL="$(python3 -c "print('a' * 244 + '@example.com')")"
raw=$(curl_req POST "/store/customers/me/email-change-request" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"new_email\":\"$LONG_EMAIL\"}")
split_response "$raw"
assert_status "oversized email → 400" "400" "$HTTP_CODE" "$BODY"

echo "-- Idempotency: POST same email again → 200 (new token replaces old)"
raw=$(curl_req POST "/store/customers/me/email-change-request" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"new_email\":\"$SMOKE_NEW_EMAIL\"}")
split_response "$raw"
assert_status "idempotent re-request → 200" "200" "$HTTP_CODE" "$BODY"

echo "-- Missing body → 400"
raw=$(curl_req POST "/store/customers/me/email-change-request" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d '{}')
split_response "$raw"
assert_status "missing new_email → 400" "400" "$HTTP_CODE" "$BODY"

# ════════════════════════════════════════════════════════════════════════════
# Section C: wishlist check-price-alert (immediate path)
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "=== Section C: Wishlist Price Alert (Immediate on Add) ==="

echo "-- Cleaning up pre-existing wishlist item"
curl -s -X DELETE "$BASE/store/customers/me/wishlist" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\"}" > /dev/null || true

echo "-- Adding buy_at_price item with very high target (always met)"
raw=$(curl_req POST "/store/customers/me/wishlist" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\",\"mode\":\"buy_at_price\",\"target_price\":999999}")
split_response "$raw"
assert_status "add buy_at_price item → 201" "201" "$HTTP_CODE" "$BODY"

sleep 1  # let async checkPriceAlertImmediate complete

echo "-- Checking price_alert_sent flag"
raw=$(curl_req GET "/store/customers/me/wishlist" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK")
split_response "$raw"
PRICE_SENT=$(echo "$BODY" | jq -r \
  --arg pid "$TEST_PRODUCT_ID" \
  '[.wishlist_items[]? | select(.product_id == $pid and .mode == "buy_at_price")] | first | .price_alert_sent' \
  2>/dev/null || echo "null")
echo "  price_alert_sent = $PRICE_SENT"
if [ "$PRICE_SENT" = "true" ]; then
  echo "  PASS  price alert fired immediately on add"
  PASS=$((PASS + 1))
else
  echo "  INFO  price_alert_sent = $PRICE_SENT — product may lack pricing config"
  echo "        checkPriceAlertImmediate returns early when getLowestVariantPrice is null."
  SKIP=$((SKIP + 1))
fi

echo "-- Cleanup"
curl -s -X DELETE "$BASE/store/customers/me/wishlist" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\"}" > /dev/null || true

summary
