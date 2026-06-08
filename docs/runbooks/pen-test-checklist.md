# Pen Test Checklist — Hops & Glory

**Stack**: Medusa v2 backend (:9000) + Next.js 15 storefront (:8000)  
**Tooling**: Burp Suite Community, curl, `scripts/smoke/security.sh`

---

## Setup

```bash
# Start a Burp proxy on :8080, configure browser to route through it
# Then run the site with proxy:
HTTPS_PROXY=http://localhost:8080 pnpm dev

# Required env for security.sh
export MEDUSA_PUBLISHABLE_KEY=pk_...
export CUSTOMER_JWT=...       # approved member
export ATTACKER_JWT=...       # second approved member
export ADMIN_EMAIL=admin@example.test
export ADMIN_PASSWORD=ChangeMe123!
bash scripts/smoke/security.sh
```

---

## A1 — Broken Access Control

### IDOR (Insecure Direct Object Reference)

| Endpoint                                                      | Test                                                          | Expected                                |
| ------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------- |
| `GET /store/customers/me/wishlist`                            | Auth as customer B, try to access customer A's wishlist items | 200 but scoped to B only — no A data    |
| `GET /store/customers/me/notifications`                       | Auth as B                                                     | 200 but only B's notifications          |
| `GET /store/customers/me/restock-alerts`                      | Auth as B                                                     | 200 but only B's alerts                 |
| `GET /store/customers/me/hop-alerts`                          | Auth as B                                                     | 200 but only B's hop alerts             |
| `GET /store/customers/me/referrals`                           | Auth as B                                                     | 200 but only B's referral code/history  |
| `DELETE /store/customers/me/hop-alerts` with B's known hop_id | Auth as A                                                     | 200 but only deletes A's alert, not B's |

**Manual check**: After logging in as customer B, inspect all `/me/` responses — none should contain customer A's IDs or data.

### Forced Browsing

| Path                               | Test                                  | Expected                                    |
| ---------------------------------- | ------------------------------------- | ------------------------------------------- |
| `POST /store/carts/:id/line-items` | Auth as pending/non-approved customer | 403 (enforce-access-on-cart-add middleware) |
| `GET /checkout`                    | Non-authenticated                     | Redirect to `/`                             |
| `GET /account/vip`                 | Non-authenticated                     | Redirect to login                           |
| `GET /shipping`                    | Non-approved                          | Redirect to `/`                             |

### Function-Level Authorization

| Endpoint                            | Test               | Expected |
| ----------------------------------- | ------------------ | -------- |
| `GET /admin/members`                | No auth            | 401      |
| `POST /admin/product-images/commit` | No auth            | 401      |
| `GET /admin/insights`               | No auth            | 401      |
| `POST /admin/members/:id/approve`   | Store customer JWT | 401      |

---

## A2 — Cryptographic Failures

| Check                           | How                                           | Expected                                                                                    |
| ------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| HTTPS enforcement               | `curl -I http://hopsandglory.au` (production) | 301 redirect to https                                                                       |
| Cookie flags: `_medusa_jwt`     | Burp → Inspect Set-Cookie                     | `Secure; HttpOnly; SameSite=Lax`                                                            |
| Cookie flags: `_medusa_cart_id` | Burp → Inspect Set-Cookie                     | `Secure; HttpOnly; SameSite=Lax`                                                            |
| HSTS header                     | `curl -I https://hopsandglory.au`             | `strict-transport-security: max-age=63072000; includeSubDomains; preload` (Caddy sets this) |
| JWT algorithm                   | Decode the `_medusa_jwt` value                | Header `alg` should be `HS256` or `RS256`, NOT `none`                                       |

---

## A3 — Injection

### XSS via registration fields

The `safeText` transform in `sanitize-text.ts` strips HTML at the server. Verify:

1. Register with `first_name: <script>alert(1)</script>` — stored value should be sanitised
2. Check `/app/members` in admin — first name should render as plain text, no script execution
3. Register with `why_join` containing a `<img onerror=...>` — same sanitisation expected

### SQL injection via search

`GET /store/search?q='; DROP TABLE products; --` → backend should return 200 with empty results, no 500.

### Prototype pollution

`POST /store/customers/me/wishlist` with body `{"__proto__": {"admin": true}}` → 400 or 200 with no pollution (Medusa's Zod validation blocks extra keys).

---

## A4 — Insecure Design

### VIP score gaming

- Can a customer place a $0 order and gain VIP score? No — `calculate-vip-score` only counts orders where `payment_collection.captured_amount > 0`.
- Can a customer self-refer? Try registering with their own referral code — the `validateReferralCodeStep` would find their own customer_id, creating a self-referral loop. **Check**: does `createReferralStep` guard against `referrer_customer_id === referred_customer_id`?

### Early access window bypass

- Can a non-VIP customer purchase a product with `release_at` in the future? `enforce-access-on-cart-add` middleware checks tier vs `early_access_until`. Verify 403 for insufficient tier.
- Can a customer manipulate the `release_at` metadata via any store endpoint? No exposed write path — metadata is set by admin only.

### Buy-at-price promotion drift

- The Medusa promotion is created with a fixed discount delta. If the product price changes after an offer is approved, the effective price may differ. This is documented in `PRE-LAUNCH.md` as accepted drift — no automated fix.

---

## A5 — Security Misconfiguration

### Admin path enumeration

- `/admin/*` → all routes require admin JWT. The custom admin path `/troon/admin` masks the standard `/app` admin.
- Verify `/app/members`, `/app/buy-at-price`, etc. require auth even when accessed directly.

### CORS

```bash
curl -s -I -X OPTIONS https://api.hopsandglory.au/store/products \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: GET"
```

Expected: `Access-Control-Allow-Origin` should NOT be `*` or `https://evil.com`.

### X-Frame-Options / CSP

- `frame-ancestors 'none'` in CSP (set in middleware.ts) prevents clickjacking.
- Verify with Burp: response headers include `content-security-policy: ... frame-ancestors 'none' ...`

### Referrer-Policy

Expected: `referrer-policy: strict-origin-when-cross-origin` (set by Caddy `security_headers` snippet).

---

## A6 — Vulnerable Components

```bash
cd apps/backend && pnpm audit --audit-level=high
cd apps/storefront && pnpm audit --audit-level=high
```

Review any high/critical CVEs in Medusa 2.15.x, Next.js 15.x, or transitive dependencies.

---

## A7 — Authentication Failures

### JWT algorithm confusion

Decode the `_medusa_jwt` token (base64 split on `.`). Check `alg` field — must not be `none`.

### Stale registration token reuse

1. Call `sdk.auth.register()` to get a registration token
2. Use it to register (creates a "pending" customer)
3. Wait 10+ minutes
4. Try to use the SAME registration token again → should be rejected (401)

### Email-change token isolation

1. Customer A requests an email-change token
2. Customer B (different account) tries to confirm with that token → should get 400 (token bound to A)

### Email-change token brute-force window

Token is 32 bytes of crypto random base64url = 256 bits of entropy. No brute-force risk in practice. However, the `/store/email-change/confirm` endpoint has **no rate limiting**. Consider adding it before launch.

---

## A8 — Software Integrity

- CI builds use `pnpm install --frozen-lockfile` — lockfile is committed
- GitHub Actions push images to GHCR with `sha-<short>` tags — pinned at deploy time
- Renovate config watches for dependency updates

---

## A9 — Logging Gaps

Verify these events produce backend log entries:

| Event                              | Log expected                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| Admin login failure                | Medusa default — check `/tmp/hg-backend.log` for 401 on `/auth/user/emailpass` |
| Payment captured                   | `[PayID] Payment captured: {...}`                                              |
| VIP progression                    | `[VIP] Progression evaluated for buyer ...`                                    |
| Registration with invalid referral | No error, silent skip (acceptable — add log if needed)                         |
| Webhook HMAC failure               | HTTP 401 response — check Medusa default error logging                         |

---

## A10 — SSRF

### Image commit endpoint

`POST /admin/product-images/commit` with `url: "http://169.254.169.254/latest/meta-data/"` → **400** (SSRF guard added in `commit/route.ts` — `isSafeUrl` requires `https://` and blocks metadata IPs).

### AusPost test-connection endpoint

`POST /admin/shipping/auspost/test-connection` — verify it only connects to `api.auspost.com.au`, not arbitrary URLs.

### ShipEngine rate lookup

`POST /store/shipping/rates` → proxies to ShipEngine. The carrier_ids are hardcoded in config — no user-controlled URL injection.

---

## Quick-run checklist (before each release)

```bash
# Static security scan
pnpm audit --audit-level=high
npx semgrep --config=auto apps/backend/src apps/storefront/src 2>/dev/null | grep -E "ERROR|WARNING" | head -20

# Automated surface sweep
bash scripts/smoke/security.sh

# Manual: visit securityheaders.com with staging URL
# Manual: verify no .env files in git history: git log --all --full-history -- "*.env"
```
