#!/usr/bin/env bash
# scripts/smoke/sprint-11b.sh — Email-change + password-change endpoint smoke.
#
# Requires:
#   MEDUSA_BACKEND_URL       default: http://localhost:9000
#   MEDUSA_PUBLISHABLE_KEY   a valid publishable API key
#   CUSTOMER_EMAIL           email of a registered (approved) customer
#   CUSTOMER_PASSWORD        password for CUSTOMER_EMAIL
#
# Usage:
#   export MEDUSA_PUBLISHABLE_KEY=pk_... CUSTOMER_EMAIL=... CUSTOMER_PASSWORD=...
#   bash scripts/smoke/sprint-11b.sh

set -euo pipefail
source "$(dirname "$0")/helpers.sh"

PUBKEY="${MEDUSA_PUBLISHABLE_KEY:?set MEDUSA_PUBLISHABLE_KEY}"
CUST_EMAIL="${CUSTOMER_EMAIL:?set CUSTOMER_EMAIL}"
CUST_PASS="${CUSTOMER_PASSWORD:?set CUSTOMER_PASSWORD}"

echo "── Sprint 11b smoke: email-change + password ─────────────────────────────"

# ── 1. Login to get a JWT ────────────────────────────────────────────────────
echo "1. Login"
CUST_JWT=$(curl -s -X POST "${BASE}/auth/customer/emailpass" \
  -H "content-type: application/json" \
  -d "{\"email\":\"${CUST_EMAIL}\",\"password\":\"${CUST_PASS}\"}" \
  | node -e "process.stdin.on('data',b=>{ const d=JSON.parse(b); if(d.token) process.stdout.write(d.token); })")
if [ -z "$CUST_JWT" ]; then
  echo "  FAIL  could not login — check CUSTOMER_EMAIL/PASSWORD"
  FAIL=$((FAIL+1))
else
  echo "  PASS  login OK"
  PASS=$((PASS+1))
fi

H_AUTH=(-H "authorization: Bearer ${CUST_JWT}" -H "x-publishable-api-key: ${PUBKEY}" -H "content-type: application/json")

# ── 2. Email-change request — valid ──────────────────────────────────────────
echo "2. Email-change: valid new_email → 200"
NEW_EMAIL="smoke-changed-${RANDOM}@hg-smoke.dev"
code=$(curl -s -o /tmp/ecr.json -w "%{http_code}" -X POST "${BASE}/store/customers/me/email-change-request" \
  "${H_AUTH[@]}" -d "{\"new_email\":\"${NEW_EMAIL}\"}")
assert_status "POST email-change-request valid" "200" "$code"

# ── 3. Email-change request — invalid email → 400 ────────────────────────────
echo "3. Email-change: invalid email → 400"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/store/customers/me/email-change-request" \
  "${H_AUTH[@]}" -d '{"new_email":"not-an-email"}')
assert_status "POST email-change-request invalid email" "400" "$code"

# ── 4. Email-change confirm — unknown token → 400 ────────────────────────────
echo "4. Email-change confirm: unknown token → 404"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/store/email-change/confirm" \
  "${H_AUTH[@]}" -d '{"token":"definitely-not-a-real-token-abc123xyz"}')
assert_status "POST email-change/confirm unknown token" "404" "$code"

# ── 5. Email-change unauthenticated → 401/403 ────────────────────────────────
echo "5. Email-change: unauthenticated → 401"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/store/customers/me/email-change-request" \
  -H "x-publishable-api-key: ${PUBKEY}" -H "content-type: application/json" \
  -d "{\"new_email\":\"anon@test.dev\"}")
if [ "$code" = "401" ] || [ "$code" = "403" ]; then
  echo "  PASS  unauthenticated → ${code}"
  PASS=$((PASS+1))
else
  echo "  FAIL  unauthenticated (want 401/403 got ${code})"
  FAIL=$((FAIL+1))
fi

# ── 6. Password change — wrong old password → 401 ────────────────────────────
echo "6. Password: wrong old password → 401"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/store/customers/me/password" \
  "${H_AUTH[@]}" -d '{"old_password":"WrongPassword!","new_password":"NewSecurePassword123!"}')
if [ "$code" = "401" ] || [ "$code" = "400" ]; then
  echo "  PASS  wrong old password → ${code}"
  PASS=$((PASS+1))
else
  echo "  FAIL  wrong old password (want 401/400 got ${code})"
  FAIL=$((FAIL+1))
fi

# ── 7. Password change — too short new password → 400 ────────────────────────
echo "7. Password: short new password → 400"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/store/customers/me/password" \
  "${H_AUTH[@]}" -d "{\"old_password\":\"${CUST_PASS}\",\"new_password\":\"short\"}")
assert_status "POST password short new_password" "400" "$code"

# ── 8. Password change — same as old → 400 ───────────────────────────────────
echo "8. Password: same as old → 400"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/store/customers/me/password" \
  "${H_AUTH[@]}" -d "{\"old_password\":\"${CUST_PASS}\",\"new_password\":\"${CUST_PASS}\"}")
assert_status "POST password same as old" "400" "$code"

echo ""
echo "──────────────────────────────────────────────────────────────────────────"
summary
