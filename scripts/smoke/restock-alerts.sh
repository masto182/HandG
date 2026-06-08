#!/usr/bin/env bash
# scripts/smoke/restock-alerts.sh
# Tests the full restock-alert subscribe → detect → dispatch loop.
#
# Required env:
#   MEDUSA_PUBLISHABLE_KEY
#   VIP5_JWT                 VIP5 customer Bearer token (offset=0h, dispatches immediately)
#   TEST_PRODUCT_ID          a published product that has variants
#
# Optional:
#   MEDUSA_BACKEND_URL       default: http://localhost:9000
#   ADMIN_EMAIL / ADMIN_PASSWORD
#
# Usage: bash scripts/smoke/restock-alerts.sh

set -euo pipefail
source "$(dirname "$0")/helpers.sh"

: "${MEDUSA_PUBLISHABLE_KEY:?MEDUSA_PUBLISHABLE_KEY is required}"
: "${VIP5_JWT:?VIP5_JWT is required}"
: "${TEST_PRODUCT_ID:?TEST_PRODUCT_ID is required}"

BACKEND_DIR="$(cd "$(dirname "$0")/../../apps/backend" && pwd)"
PK="$MEDUSA_PUBLISHABLE_KEY"

echo ""
echo "=== Restock Alert Smoke Test ==="
echo "Product: $TEST_PRODUCT_ID"
echo ""

# ── Step 1: Get a beer name from the product ──────────────────────────────────
echo "-- Fetching product info"
raw=$(curl_req GET "/store/products/$TEST_PRODUCT_ID" \
  -H "x-publishable-api-key: $PK")
split_response "$raw"
assert_status "fetch test product" "200" "$HTTP_CODE" "$BODY"

BEER_NAME=$(echo "$BODY" | jq -r '.product.title // "Test Beer"')
BREWERY_NAME=$(echo "$BODY" | jq -r '.product.metadata.brewery_name // "Test Brewery"')
echo "  Beer: $BEER_NAME / Brewery: $BREWERY_NAME"

# ── Step 2: Clean up any pre-existing alert for this customer + product ───────
echo ""
echo "-- Cleaning up pre-existing alerts"
existing=$(curl -s "$BASE/store/customers/me/restock-alerts?product_id=$TEST_PRODUCT_ID" \
  -H "Authorization: Bearer $VIP5_JWT" \
  -H "x-publishable-api-key: $PK" \
  | jq -r '.restock_alerts[]?.id // empty')
for aid in $existing; do
  curl -s -X DELETE "$BASE/store/customers/me/restock-alerts/$aid" \
    -H "Authorization: Bearer $VIP5_JWT" \
    -H "x-publishable-api-key: $PK" > /dev/null
  echo "  Deleted pre-existing alert $aid"
done

# ── Step 3: Subscribe ─────────────────────────────────────────────────────────
echo ""
echo "-- Subscribing VIP5 customer to restock alert"
raw=$(curl_req POST "/store/customers/me/restock-alerts" \
  -H "Authorization: Bearer $VIP5_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\",\"beer_name\":$(echo "$BEER_NAME" | jq -R .),\"brewery_name\":$(echo "$BREWERY_NAME" | jq -R .)}")
split_response "$raw"
assert_status "subscribe (expect 201)" "201" "$HTTP_CODE" "$BODY"
ALERT_ID=$(echo "$BODY" | jq -r '.restock_alert.id // empty')
echo "  Alert ID: $ALERT_ID"

# ── Step 4: GET alerts — count should be 1 ───────────────────────────────────
echo ""
echo "-- Verifying alert is pending"
raw=$(curl_req GET "/store/customers/me/restock-alerts?product_id=$TEST_PRODUCT_ID" \
  -H "Authorization: Bearer $VIP5_JWT" \
  -H "x-publishable-api-key: $PK")
split_response "$raw"
assert_status "GET pending alerts" "200" "$HTTP_CODE" "$BODY"
assert_json "pending alert count = 1" '.restock_alerts | length' "1" "$BODY"

# ── Step 5: Dedup — second subscribe should return 200 not 201 ───────────────
echo ""
echo "-- Testing dedup (second subscribe = 200)"
raw=$(curl_req POST "/store/customers/me/restock-alerts" \
  -H "Authorization: Bearer $VIP5_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\",\"beer_name\":$(echo "$BEER_NAME" | jq -R .),\"brewery_name\":$(echo "$BREWERY_NAME" | jq -R .)}")
split_response "$raw"
assert_status "dedup subscribe (expect 200)" "200" "$HTTP_CODE" "$BODY"

# ── Step 6: Stamp restock_detected_at via exec script ────────────────────────
echo ""
echo "-- Stamping restock detection (simulating product.updated subscriber)"
SMOKE_PRODUCT_ID="$TEST_PRODUCT_ID" \
  npx --prefix "$BACKEND_DIR" medusa exec ./src/scripts/smoke-restock-stamp.ts 2>&1 \
  | grep -E "\[smoke-restock-stamp\]|ERROR|error" || true

# ── Step 7: Run the dispatch cron ────────────────────────────────────────────
echo ""
echo "-- Running dispatch cron (vip5 offset=0h, should dispatch immediately)"
npx --prefix "$BACKEND_DIR" medusa exec ./src/jobs/restock-alert-dispatch.ts 2>&1 \
  | grep -E "\[Restock Alerts\]|ERROR|error" || true

# ── Step 8: Verify alert is gone (notified_at stamped) ───────────────────────
echo ""
echo "-- Verifying alert was dispatched (removed from pending list)"
raw=$(curl_req GET "/store/customers/me/restock-alerts?product_id=$TEST_PRODUCT_ID" \
  -H "Authorization: Bearer $VIP5_JWT" \
  -H "x-publishable-api-key: $PK")
split_response "$raw"
assert_status "GET after dispatch" "200" "$HTTP_CODE" "$BODY"
assert_json "pending alert count = 0 (notified_at stamped)" '.restock_alerts | length' "0" "$BODY"

# ── Step 9: Missing fields validation ────────────────────────────────────────
echo ""
echo "-- Validating required fields (missing beer_name → 400)"
raw=$(curl_req POST "/store/customers/me/restock-alerts" \
  -H "Authorization: Bearer $VIP5_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\"}")
split_response "$raw"
assert_status "missing beer_name → 400" "400" "$HTTP_CODE" "$BODY"

# ── Step 10: Subscribe again (after dispatch) + DELETE ───────────────────────
echo ""
echo "-- Re-subscribe then DELETE"
raw=$(curl_req POST "/store/customers/me/restock-alerts" \
  -H "Authorization: Bearer $VIP5_JWT" \
  -H "x-publishable-api-key: $PK" \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":\"$TEST_PRODUCT_ID\",\"beer_name\":$(echo "$BEER_NAME" | jq -R .),\"brewery_name\":$(echo "$BREWERY_NAME" | jq -R .)}")
split_response "$raw"
assert_status "re-subscribe after dispatch (201)" "201" "$HTTP_CODE" "$BODY"
NEW_ALERT_ID=$(echo "$BODY" | jq -r '.restock_alert.id // empty')

if [ -n "$NEW_ALERT_ID" ]; then
  raw=$(curl_req DELETE "/store/customers/me/restock-alerts/$NEW_ALERT_ID" \
    -H "Authorization: Bearer $VIP5_JWT" \
    -H "x-publishable-api-key: $PK")
  split_response "$raw"
  assert_status "DELETE alert" "200" "$HTTP_CODE" "$BODY"
fi

summary
