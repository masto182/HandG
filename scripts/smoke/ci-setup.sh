#!/usr/bin/env bash
# scripts/smoke/ci-setup.sh
# Prepares env vars needed by the smoke scripts in CI.
# Outputs exports to $GITHUB_ENV (GitHub Actions) or stdout.
#
# Creates/ensures two test customers exist:
#   smoke-approved@test.example.com  (approved tier)
#   smoke-vip5@test.example.com      (vip5 tier, set via medusa exec)
#
# Also resolves:
#   MEDUSA_PUBLISHABLE_KEY from the DB
#   TEST_PRODUCT_ID from /store/products
#   CUSTOMER_EMAIL / CUSTOMER_PASSWORD for sprint-11b.sh

set -euo pipefail

BASE="${MEDUSA_BACKEND_URL:-http://localhost:9000}"
BACKEND_DIR="${BACKEND_DIR:-./apps/backend}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.test}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-ChangeMe123!}"
PK_OVERRIDE="${MEDUSA_PUBLISHABLE_KEY:-}"

emit() {
  local key="$1" val="$2"
  if [ -n "${GITHUB_ENV:-}" ]; then
    echo "$key=$val" >> "$GITHUB_ENV"
  fi
  echo "export $key=$val"
}

echo "=== Smoke CI Setup ==="

# ── Admin JWT ─────────────────────────────────────────────────────────────────
echo "-- Admin auth"
ADMIN_JWT=$(curl -s -X POST "$BASE/admin/auth/token" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | jq -r '.token // empty')
if [ -z "$ADMIN_JWT" ]; then
  echo "ERROR: could not get admin token" >&2; exit 1
fi
echo "  admin token acquired"

# ── Publishable key ───────────────────────────────────────────────────────────
echo "-- Resolving publishable key"
if [ -n "$PK_OVERRIDE" ]; then
  PK="$PK_OVERRIDE"
  echo "  using override"
else
  PK=$(curl -s "$BASE/admin/api-keys?type=publishable" \
    -H "Authorization: Bearer $ADMIN_JWT" \
    | jq -r '.api_keys[0].token // empty')
fi
if [ -z "$PK" ]; then
  echo "ERROR: no publishable key found" >&2; exit 1
fi
emit "MEDUSA_PUBLISHABLE_KEY" "$PK"
echo "  publishable key set"

# ── Helper: register + login store customer ───────────────────────────────────
register_customer() {
  local email="$1" pass="$2" fname="$3"
  # 1. Register auth identity
  local reg_token
  reg_token=$(curl -s -X POST "$BASE/auth/customer/emailpass/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}" \
    | jq -r '.token // empty')

  if [ -n "$reg_token" ]; then
    # 2. Create customer record
    curl -s -X POST "$BASE/store/customers" \
      -H "Authorization: Bearer $reg_token" \
      -H "x-publishable-api-key: $PK" \
      -H "Content-Type: application/json" \
      -d "{\"first_name\":\"$fname\",\"last_name\":\"Smoke\"}" > /dev/null
  fi

  # 3. Get customer JWT (works whether customer already existed or was just created)
  curl -s -X POST "$BASE/auth/customer/emailpass" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}" \
    | jq -r '.token // empty'
}

admin_approve_customer() {
  local email="$1"
  local cust_id
  cust_id=$(curl -s "$BASE/admin/customers?q=$email" \
    -H "Authorization: Bearer $ADMIN_JWT" \
    | jq -r '.customers[0].id // empty')
  if [ -z "$cust_id" ]; then
    echo "  WARN: could not find customer $email to approve" >&2
    return
  fi
  curl -s -X POST "$BASE/admin/customers/$cust_id" \
    -H "Authorization: Bearer $ADMIN_JWT" \
    -H "Content-Type: application/json" \
    -d '{"metadata":{"membership_status":"approved"}}' > /dev/null
  echo "  approved $email ($cust_id)"
}

# ── Approved test customer ────────────────────────────────────────────────────
echo "-- Creating smoke-approved customer"
CUSTOMER_JWT=$(register_customer "smoke-approved@test.example.com" "SmokeApproved1!" "SmokeApproved")
admin_approve_customer "smoke-approved@test.example.com"
if [ -n "$CUSTOMER_JWT" ]; then
  emit "CUSTOMER_JWT" "$CUSTOMER_JWT"
else
  echo "ERROR: could not get CUSTOMER_JWT" >&2; exit 1
fi

# ── VIP5 test customer ────────────────────────────────────────────────────────
echo "-- Creating smoke-vip5 customer"
VIP5_JWT=$(register_customer "smoke-vip5@test.example.com" "SmokeVip5Test1!" "SmokeVip5")
admin_approve_customer "smoke-vip5@test.example.com"

# Elevate to VIP5 via medusa exec
VIP5_ID=$(curl -s "$BASE/admin/customers?q=smoke-vip5@test.example.com" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  | jq -r '.customers[0].id // empty')
if [ -n "$VIP5_ID" ]; then
  SMOKE_VIP5_CUSTOMER_ID="$VIP5_ID" \
    npx --prefix "$BACKEND_DIR" medusa exec ./src/scripts/smoke-set-vip-tier.ts 2>&1 \
    | grep -E "\[smoke-set-vip\]|ERROR" || true
fi

if [ -n "$VIP5_JWT" ]; then
  emit "VIP5_JWT" "$VIP5_JWT"
else
  echo "ERROR: could not get VIP5_JWT" >&2; exit 1
fi

# ── Test product ──────────────────────────────────────────────────────────────
echo "-- Resolving TEST_PRODUCT_ID"
TEST_PRODUCT_ID=$(curl -s "$BASE/store/products?limit=1&status=published" \
  -H "x-publishable-api-key: $PK" \
  | jq -r '.products[0].id // empty')
if [ -z "$TEST_PRODUCT_ID" ]; then
  echo "ERROR: no published products found — run seed-e2e first" >&2; exit 1
fi
emit "TEST_PRODUCT_ID" "$TEST_PRODUCT_ID"
echo "  test product: $TEST_PRODUCT_ID"

# ── sprint-11b / security smoke customer vars ─────────────────────────────────
# sprint-11b.sh and security.sh need CUSTOMER_EMAIL + CUSTOMER_PASSWORD.
# Reuse the approved smoke customer created above.
emit "CUSTOMER_EMAIL" "smoke-approved@test.example.com"
emit "CUSTOMER_PASSWORD" "SmokeApproved1!"

echo "=== CI setup complete ==="
