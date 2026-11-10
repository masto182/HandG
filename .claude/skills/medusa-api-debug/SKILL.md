---
name: medusa-api-debug
description: "Debug Medusa backend API endpoints directly via curl with a live JWT token. Use when: server actions silently fail, wishlist/likes/custom routes return errors, debugging auth issues, testing API endpoints before writing frontend code, verifying backend route behavior. Triggers: server action failing, API not working, debug endpoint, test route, curl test, verify API, backend not responding, 401 unauthorized, 500 error from server action."
---

# Medusa API Debug

Fastest way to diagnose Medusa backend issues: bypass the storefront entirely and hit the API directly with curl + a fresh JWT token.

## When to Use

- Server action returns `false` / silently fails with no visible error
- A client component shows no data despite calling a server action
- Suspecting auth, missing DB column, route not registered, or body parsing issue
- Want to verify an endpoint works before writing frontend code

## Key Insight

Server action `console.error` logs appear in the **Next.js terminal**, NOT the browser DevTools console. Direct curl testing is faster and gives the exact Postgres/Medusa error message.

## Environment

```
Storefront:     http://localhost:8000
Medusa backend: http://localhost:9000
Publishable key: pk_3e3eb2623bb1b1ca57f81b53cf602504f871ac3c0d26e6acf8c35d06ff5b3bd3
DB:             postgres://medusa:medusa_dev_password@localhost:5432/medusa (see apps/backend/.env DATABASE_URL — this changes, always confirm there first)
```

**Test accounts:**

| Email                         | Password         | Tier     |
| ----------------------------- | ---------------- | -------- |
| approved@test.hopsandglory.au | TestApproved123! | approved |
| vip@test.hopsandglory.au      | TestVip123!      | vip3     |
| pending@test.hopsandglory.au  | TestPending123!  | pending  |

## Workflow

### Step 1: Get a JWT token

```bash
TOKEN=$(curl -s -X POST http://localhost:9000/auth/customer/emailpass \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pk_3e3eb2623bb1b1ca57f81b53cf602504f871ac3c0d26e6acf8c35d06ff5b3bd3" \
  -d '{"email":"approved@test.hopsandglory.au","password":"TestApproved123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('token','NO_TOKEN'))")
echo "Token: ${TOKEN:0:30}..."
```

If token is empty, the account doesn't exist — run the seed script:

```bash
cd /Users/cmasterson/projects/HandG/apps/backend && npx medusa exec ./src/scripts/seed-test-accounts.ts
```

**Admin auth** (for `/admin/*` routes, not `/store/*`): use `/auth/user/emailpass` instead of `/auth/customer/emailpass`, with an admin user's email/password (check `user` table in DB for available admin emails; password not stored in this repo — ask the operator).

```bash
TOKEN=$(curl -s -X POST http://localhost:9000/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hopsandglory.au","password":"..."}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('token','NO_TOKEN'))")
```

### Step 2: Test the endpoint

Replace `ENDPOINT` and `METHOD` as needed:

**GET:**

```bash
curl -s "http://localhost:9000/ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-publishable-api-key: pk_3e3eb2623bb1b1ca57f81b53cf602504f871ac3c0d26e6acf8c35d06ff5b3bd3" \
  -H "Content-Type: application/json" | python3 -m json.tool
```

**POST with body:**

```bash
curl -s -X POST "http://localhost:9000/ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-publishable-api-key: pk_3e3eb2623bb1b1ca57f81b53cf602504f871ac3c0d26e6acf8c35d06ff5b3bd3" \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}' | python3 -m json.tool
```

**DELETE with body:**

```bash
curl -s -X DELETE "http://localhost:9000/ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-publishable-api-key: pk_3e3eb2623bb1b1ca57f81b53cf602504f871ac3c0d26e6acf8c35d06ff5b3bd3" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"prod_xxx"}' | python3 -m json.tool
```

### Step 3: Diagnose by error

| Response                                                           | Root Cause                                                                                                                                  | Fix                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `401 Unauthorized`                                                 | Token expired or route auth missing                                                                                                         | Re-run Step 1 to get fresh token                                                                                                                                                                                                                  |
| `404 Not Found`                                                    | Route not registered                                                                                                                        | Check `apps/backend/src/api/` route file exists and exports correct method                                                                                                                                                                        |
| `500` + `column "X" does not exist`                                | Missing DB column, migration not run                                                                                                        | Add column: `node -e "require('pg').Client... ALTER TABLE ..."`                                                                                                                                                                                   |
| `500` + `relation "X" does not exist`                              | Missing DB table, migration not run                                                                                                         | Run `npx medusa db:migrate` or add table manually                                                                                                                                                                                                 |
| `500` + `Cannot read properties of undefined`                      | Service method called with wrong args                                                                                                       | Check `req.scope.resolve()` service name matches module registration                                                                                                                                                                              |
| `400 invalid_data`                                                 | Body validation failure                                                                                                                     | Check body matches what route handler destructures                                                                                                                                                                                                |
| `{}` empty response                                                | Route doesn't call `res.json()`                                                                                                             | Check route handler for missing response                                                                                                                                                                                                          |
| Computed field (e.g. `order.total`) is `0`/wrong despite real data | Medusa 2.17.2 quirk: requesting `items.*` in the SAME `query.graph` call as a computed getter field silently breaks that getter's hydration | Split into two `query.graph` calls (one for the computed field/relations, one for `items.*`) and merge in code. Confirmed on `order.total`; `cart.subtotal` was checked and is NOT affected — verify empirically per-entity/field before assuming |

### Step 4: DB operations (if needed)

Run SQL directly when `npx medusa db:migrate` fails:

```bash
cd /Users/cmasterson/projects/HandG/apps/backend && node -e "
require('dotenv').config();
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(() => c.query('YOUR SQL HERE'))
  .then(r => { console.log('Result:', r.command, r.rowCount); c.end(); })
  .catch(e => { console.error('Error:', e.message); c.end(); });
"
```

Common fixes:

```sql
-- Add missing column
ALTER TABLE tablename ADD COLUMN IF NOT EXISTS colname TYPE NOT NULL DEFAULT value;

-- Check table columns
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tablename';

-- Check if table exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### Step 5: Check the Next.js server terminal

Server action errors (`console.error`) appear ONLY in the terminal running `pnpm dev`. Look for:

- `[Wishlist]`, `[Likes]`, `[Referrals]` prefixes (custom error logging)
- Unhandled error stack traces from Next.js

If the terminal shows no errors but the UI still breaks, the issue is client-side (check browser DevTools console for JS errors).

## Common API Endpoints

```
GET  /store/customers/me/wishlist
POST /store/customers/me/wishlist          body: {product_id, mode, target_price, stock_threshold}
DELETE /store/customers/me/wishlist        body: {product_id}
PATCH /store/customers/me/wishlist/:id     body: {mode, target_price, stock_threshold}

GET  /store/customers/me/likes
POST /store/products/:id/likes

GET  /store/customers/me/referrals
GET  /store/customers/me/vip
GET  /store/customers/me/membership

GET  /store/customers/me
GET  /store/customers/me/notifications
```

## Medusa 2.22 Gotchas

HandG runs Medusa 2.22.4; the upstream skills stop at v2.17.3. Before debugging missing fields, `unknown` resolves, stale listings, or wrong totals, load `reference/medusa-2-22-gotchas.md`.

## Stopping Points

None — this is a pure diagnostic skill. After identifying the root cause, fix it and move on.

## Output

The exact error message from Medusa/Postgres, enabling a targeted fix rather than guesswork.
