#!/usr/bin/env bash
set -euo pipefail

BASE="${MEDUSA_BACKEND_URL:-http://localhost:9000}"
PUBKEY="${MEDUSA_PUBLISHABLE_KEY:?set MEDUSA_PUBLISHABLE_KEY}"
JWT="${CUSTOMER_JWT:?set CUSTOMER_JWT (logged-in approved member token)}"
HOP_ID="${HOP_ID:?set HOP_ID (an existing hop id)}"

H_AUTH=(-H "authorization: Bearer ${JWT}" -H "x-publishable-api-key: ${PUBKEY}" -H "content-type: application/json")
PASS=0; FAIL=0
check() { if [ "$1" = "$2" ]; then echo "PASS: $3"; PASS=$((PASS+1)); else echo "FAIL: $3 (want $2 got $1)"; FAIL=$((FAIL+1)); fi; }

echo "1. subscribe to hop alert (email off, in-app on)"
code=$(curl -s -o /tmp/ha.json -w "%{http_code}" -X POST "${BASE}/store/customers/me/hop-alerts" "${H_AUTH[@]}" -d "{\"hop_id\":\"${HOP_ID}\",\"channel_email\":false,\"channel_inapp\":true}")
check "$code" "201" "POST hop-alert creates (201)"

echo "2. list hop alerts includes it with channels persisted"
curl -s "${BASE}/store/customers/me/hop-alerts?hop_id=${HOP_ID}" "${H_AUTH[@]}" > /tmp/ha_list.json
em=$(node -e "const d=require('/tmp/ha_list.json');console.log((d.hop_alerts[0]||{}).channel_email)")
check "$em" "false" "channel_email persisted false"

echo "3. re-POST flips email on (upsert, no duplicate)"
code=$(curl -s -o /tmp/ha2.json -w "%{http_code}" -X POST "${BASE}/store/customers/me/hop-alerts" "${H_AUTH[@]}" -d "{\"hop_id\":\"${HOP_ID}\",\"channel_email\":true}")
check "$code" "200" "POST upsert returns 200 (existing)"
count=$(curl -s "${BASE}/store/customers/me/hop-alerts?hop_id=${HOP_ID}" "${H_AUTH[@]}" | node -e "process.stdin.on('data',b=>console.log(JSON.parse(b).hop_alerts.length))")
check "$count" "1" "no duplicate row after upsert"

echo "4. invalid body rejected"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/store/customers/me/hop-alerts" "${H_AUTH[@]}" -d "{}")
check "$code" "400" "missing hop_id rejected (400)"

echo "5. unsubscribe"
code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${BASE}/store/customers/me/hop-alerts" "${H_AUTH[@]}" -d "{\"hop_id\":\"${HOP_ID}\"}")
check "$code" "200" "DELETE hop-alert (200)"
count=$(curl -s "${BASE}/store/customers/me/hop-alerts?hop_id=${HOP_ID}" "${H_AUTH[@]}" | node -e "process.stdin.on('data',b=>console.log(JSON.parse(b).hop_alerts.length))")
check "$count" "0" "alert removed"

echo "-----"
echo "PASS=${PASS} FAIL=${FAIL}"
[ "$FAIL" = "0" ]
