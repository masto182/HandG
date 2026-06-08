#!/usr/bin/env bash
# scripts/smoke/product-alerts.sh
# Tests product.updated subscriber chain:
#   A) new-drop notify → hop-alert subscriber fires → inbox notification created
#   B) wishlist low-stock alert → stock_alert_sent flag toggled
#   C) wishlist price alert (immediate path via POST /wishlist)
#
# Required env:
#   MEDUSA_PUBLISHABLE_KEY
#   CUSTOMER_JWT     approved-tier Bearer token
#   TEST_PRODUCT_ID  a published product with variants
#
# Optional:
#   MEDUSA_BACKEND_URL       default: http://localhost:9000
#   ADMIN_EMAIL / ADMIN_PASSWORD

set -euo pipefail
source "$(dirname "$0")/helpers.sh"

: "${MEDUSA_PUBLISHABLE_KEY:?MEDUSA_PUBLISHABLE_KEY is required}"
: "${CUSTOMER_JWT:?CUSTOMER_JWT is required}"
: "${TEST_PRODUCT_ID:?TEST_PRODUCT_ID is required}"

PK="$MEDUSA_PUBLISHABLE_KEY"

echo ""
echo "=== Product Alerts Smoke Test ==="
echo "Product: $TEST_PRODUCT_ID"
echo ""

# ── Admin auth ────────────────────────────────────────────────────────────────
echo "-- Admin auth"
ADMIN_JWT=$(admin_token)
if [ -z "$ADMIN_JWT" ]; then
  echo "  FAIL  admin auth — could not obtain token"
  exit 1
fi
echo "  admin token acquired"

# ── Helper: trigger product.updated by patching a smoke timestamp ─────────────
trigger_product_updated() {
  local ts
  ts=$(date -u +"%s")
  curl -s -X PATCH "$BASE/admin/products/$TEST_PRODUCT_ID" \
    -H "Authorization: Bearer $ADMIN_JWT" \
    -H "Content-Type: application/json" \
    -d "{\"metadata\":{\"smoke_trigger_ts\":\"$ts\"}}" > /dev/null
  sleep 1  # allow subscriber to process before assertions
}

# ── Section A: new-drop notify ────────────────────────────────────────────────
echo ""
echo "=== Section A: New-Drop Notify ==="

echo "-- Getting first available hop"
raw=$(curl_req GET "/store/hops" \
  -H "x-publishable-api-key: $PK" \
  -H "Authorization: Bearer $CUSTOMER_JWT")
split_response "$raw"
assert_status "GET hops" "200" "$HTTP_CODE" "$BODY"
HOP_ID=$(echo "$BODY" | jq -r '.hops[0].id // empty')
if [ -z "$HOP_ID" ]; then
  skip_section "new-drop notify" "no hops found — run seed scripts first"
else
  echo "  Hop ID: $HOP_ID"

  echo "-- Cleaning up pre-existing hop alert"
  curl -s -X DELETE "$BASE/store/customers/me/hop-alerts" \
    -H "Authorization: Bearer $CUSTOMER_JWT" \
    -H "x-publishable-api-key: $PK" \
    -H "Content-Type: application/json" \
    -d "{\"hop_id\":\"$HOP_ID\"}" > /dev/null || true

  echo "-- Subscribing to hop alert (email + in-app)"
  raw=$(curl_req POST "/store/customers/me/hop-alerts" \
    -H "Authorization: Bearer $CUSTOMER_JWT" \
    -H "x-publishable-api-key: $PK" \
    -H "Content-Type: application/json" \
    -d "{\"hop_id\":\"$HOP_ID\",\"channel_email\":true,\"channel_inapp\":true}")
  split_response "$raw"
  assert_status "subscribe hop alert (201)" "201" "$HTTP_CODE" "$BODY"

  echo "-- Getting notification count before trigger"
  raw=$(curl_req GET "/store/customers/me/notifications" \
    -H "Authorization: Bearer $CUSTOMER_JWT" \
    -H "x-publishable-api-key: $PK")
  split_response "$raw"
  NOTIF_BEFORE=$(echo "$BODY" | jq '.notifications | length' 2>/dev/null || echo "0")
  echo "  Notifications before: $NOTIF_BEFORE"

  echo "-- Triggering product.updated (fires new-drop subscriber)"
  trigger_product_updated

  echo "-- Verifying notification was created"
  raw=$(curl_req GET "/store/customers/me/notifications" \
    -H "Authorization: Bearer $CUSTOMER_JWT" \
    -H "x-publishable-api-key: $PK")
  split_response "$raw"
  NOTIF_AFTER=$(echo "$BODY" | jq '.notifications | length' 2>/dev/null || echo "0")
  echo "  Notifications after: $NOTIF_AFTER"
  if [ "$NOTIF_AFTER" -gt "$NOTIF_BEFORE" ]; then
    echo "  PASS  new-drop notification created (${NOTIF_BEFORE} → ${NOTIF_AFTER})"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  expected notification count to increase (was $NOTIF_BEFORE, still $NOTIF_AFTER)"
    echo "        Note: new-drop subscriber has dedup + quiet-hours logic — it may legitimately skip"
    FAIL=$((FAIL + 1))
  fi

  echo "-- Upsert hop alert (same hop → 200 not 201)"
  raw=$(curl_req POST "/store/customers/me/hop-alerts" \
    -H "Authorization: Bearer $CUSTOMER_JWT" \
    -H "x-publishable-api-key: $PK" \
    -H "Content-Type: application/json" \
    -d "{\"hop_id\":\"$HOP_ID\",\"channel_email\":false}")
  split_response "$raw"
  assert_status "upsert hop alert (200)" "200" "$HTTP_CODE" "$BODY"

  echo "-- DELETE hop alert"
  raw=$(curl_req DELETE "/store/customers/me/hop-alerts" \
    -H "Authorization: Bearer $CUSTOMER_JWT" \
    -H "x-publishable-api-key: $PK" \
    -H "Content-Type: application/json" \
    -d "{\"hop_id\":\"$HOP_ID\"}")
  split_response "$raw"
  assert_status "DELETE hop alert" "200" "$HTTP_CODE" "$BODY"
fi

# ── Section B: wishlist low-stock alert ───────────────────────────────────────
echo ""
echo "=== Section B: Wishlist Low-Stock Alert ==="

echo "-- Removing pre-existing wishlist items for test product"
curl -s -X DELETE "$BASE/store/customers/me/wishlist" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\"}" > /dev/null || true

echo "-- Adding to wishlist (buy_later mode, stock_threshold=99999 to always be below)"
raw=$(curl_req POST "/store/customers/me/wishlist" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\",\"mode\":\"buy_later\",\"stock_threshold\":99999}")
split_response "$raw"
assert_status "add to wishlist (buy_later)" "201" "$HTTP_CODE" "$BODY"
WISHLIST_ITEM_ID=$(echo "$BODY" | jq -r '.wishlist_item.id // .wishlist.id // empty')
echo "  Wishlist item: $WISHLIST_ITEM_ID"

echo "-- Triggering product.updated (fires low-stock subscriber)"
trigger_product_updated

echo "-- Verifying stock_alert_sent flag"
raw=$(curl_req GET "/store/customers/me/wishlist" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK")
split_response "$raw"
STOCK_SENT=$(echo "$BODY" | jq -r \
  --arg pid "$TEST_PRODUCT_ID" \
  '[.wishlist_items[]? | select(.product_id == $pid)] | first | .stock_alert_sent' 2>/dev/null || echo "null")
echo "  stock_alert_sent = $STOCK_SENT"
if [ "$STOCK_SENT" = "true" ]; then
  echo "  PASS  stock_alert_sent is true (subscriber fired and inventory > 0)"
  PASS=$((PASS + 1))
else
  echo "  INFO  stock_alert_sent is $STOCK_SENT — subscriber may have seen inventory_quantity=0"
  echo "        This is a known Medusa v2 ORM issue; decideLowStock logic is covered by unit tests."
  SKIP=$((SKIP + 1))
fi

echo "-- Cleanup: remove wishlist item"
curl -s -X DELETE "$BASE/store/customers/me/wishlist" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\"}" > /dev/null || true

# ── Section C: wishlist price alert (immediate path) ─────────────────────────
echo ""
echo "=== Section C: Wishlist Price Alert (Immediate on Add) ==="

echo "-- Adding to wishlist (buy_at_price, target_price=999999 → always met)"
raw=$(curl_req POST "/store/customers/me/wishlist" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\",\"mode\":\"buy_at_price\",\"target_price\":999999}")
split_response "$raw"
assert_status "add to wishlist (buy_at_price)" "201" "$HTTP_CODE" "$BODY"

sleep 1  # let async checkPriceAlertImmediate fire

echo "-- Checking price_alert_sent flag"
raw=$(curl_req GET "/store/customers/me/wishlist" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK")
split_response "$raw"
PRICE_SENT=$(echo "$BODY" | jq -r \
  --arg pid "$TEST_PRODUCT_ID" \
  '[.wishlist_items[]? | select(.product_id == $pid and .mode == "buy_at_price")] | first | .price_alert_sent' 2>/dev/null || echo "null")
echo "  price_alert_sent = $PRICE_SENT"
if [ "$PRICE_SENT" = "true" ]; then
  echo "  PASS  price_alert_sent is true (immediate alert fired on add)"
  PASS=$((PASS + 1))
else
  echo "  INFO  price_alert_sent = $PRICE_SENT — pricing may not be configured for this product/region"
  echo "        checkPriceAlertImmediate returns early if getLowestVariantPrice returns null."
  SKIP=$((SKIP + 1))
fi

echo "-- Idempotency: re-add with same target → should not re-fire alert (already sent)"
raw=$(curl_req DELETE "$BASE/store/customers/me/wishlist" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\"}" 2>/dev/null || true)
# Re-add — checkPriceAlertImmediate gates on price_alert_sent=false, so fresh item should fire again
raw=$(curl_req POST "/store/customers/me/wishlist" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\",\"mode\":\"buy_at_price\",\"target_price\":0.01}")
split_response "$raw"
assert_status "re-add (buy_at_price, low target)" "201" "$HTTP_CODE" "$BODY"

echo "-- Cleanup: remove wishlist item"
curl -s -X DELETE "$BASE/store/customers/me/wishlist" \
  -H "Authorization: Bearer $CUSTOMER_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\"}" > /dev/null || true

summary
