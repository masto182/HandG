#!/usr/bin/env bash
# scripts/smoke/helpers.sh
# Shared utilities for all Hops & Glory smoke scripts.
# Source this file at the top of each smoke script:
#   source "$(dirname "$0")/helpers.sh"
#
# Required env vars (set before sourcing or export before calling scripts):
#   MEDUSA_BACKEND_URL       default: http://localhost:9000
#   MEDUSA_PUBLISHABLE_KEY   required
#   CUSTOMER_JWT             approved-tier customer Bearer token
#   VIP5_JWT                 VIP5 customer Bearer token
#   ADMIN_EMAIL              default: admin@example.test
#   ADMIN_PASSWORD           default: ChangeMe123!
#   TEST_PRODUCT_ID          any published product with variants
#   TEST_ORDER_ID            optional — needed only for ready-for-pickup section

set -euo pipefail

BASE="${MEDUSA_BACKEND_URL:-http://localhost:9000}"
PASS=0
FAIL=0
SKIP=0

# ── Assertion helpers ─────────────────────────────────────────────────────────

assert_status() {
  local label="$1" expected="$2" actual="$3"
  local body="${4:-}"
  if [ "$actual" = "$expected" ]; then
    echo "  PASS  $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $label — expected HTTP $expected, got $actual"
    [ -n "$body" ] && echo "        body: $body"
    FAIL=$((FAIL + 1))
  fi
}

# assert_json <label> <jq_path> <expected_value> <json_body>
# jq_path examples: '.error', '.restock_alerts | length', '.ok'
assert_json() {
  local label="$1" jq_path="$2" expected="$3" body="$4"
  local actual
  actual=$(echo "$body" | jq -r "$jq_path" 2>/dev/null || echo "__jq_error__")
  if [ "$actual" = "$expected" ]; then
    echo "  PASS  $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $label — expected $jq_path = $expected, got $actual"
    echo "        body: $body"
    FAIL=$((FAIL + 1))
  fi
}

skip_section() {
  local label="$1" reason="$2"
  echo "  SKIP  $label — $reason"
  SKIP=$((SKIP + 1))
}

# ── HTTP helpers ──────────────────────────────────────────────────────────────

# curl_req <method> <path> [extra curl args...]
# Returns: body\nHTTP_CODE
curl_req() {
  local method="$1" path="$2"
  shift 2
  curl -s -w "\n%{http_code}" -X "$method" "$BASE$path" "$@"
}

split_response() {
  local raw="$1"
  BODY=$(echo "$raw" | head -n -1)
  HTTP_CODE=$(echo "$raw" | tail -1)
}

# ── Auth helpers ──────────────────────────────────────────────────────────────

admin_token() {
  local email="${ADMIN_EMAIL:-admin@example.test}"
  local pass="${ADMIN_PASSWORD:-ChangeMe123!}"
  local resp
  resp=$(curl -s -X POST "$BASE/admin/auth/token" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}")
  echo "$resp" | jq -r '.token // empty'
}

# ── Date helpers ──────────────────────────────────────────────────────────────

# date_plus_hours <N> — returns ISO 8601 UTC timestamp N hours from now
date_plus_hours() {
  local n="$1"
  if [[ "$(uname)" == "Darwin" ]]; then
    date -v+"${n}H" -u +"%Y-%m-%dT%H:%M:%SZ"
  else
    date -u -d "+${n} hours" +"%Y-%m-%dT%H:%M:%SZ"
  fi
}

# ── Summary ───────────────────────────────────────────────────────────────────

summary() {
  echo ""
  echo "──────────────────────────────────────"
  echo "Results: ${PASS} passed, ${FAIL} failed, ${SKIP} skipped"
  echo "──────────────────────────────────────"
  [ "$FAIL" -eq 0 ]
}
