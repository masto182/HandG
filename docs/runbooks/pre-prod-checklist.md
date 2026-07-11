# Pre-Prod Deployment Checklist

All code-review remediation and QA audit fixes are complete. This checklist covers
the human-only infrastructure tasks required before go-live.

---

## 1. Infrastructure — Oracle Cloud

- [ ] Provision ARM A1.Flex VM (2 OCPU, 12 GB RAM, 50 GB boot volume)
- [ ] Create OCI Object Storage bucket `hopsandglory-backups` in the same region
- [ ] Configure VCN: open port 80 + 443 only; block 9000, 5432, 6379, 6371 externally
- [ ] Install Docker + Docker Compose on VM
- [ ] Create directories (prod deploy dir MUST match deploy-prod.yml: `/opt/retail-example`):
  ```bash
  sudo mkdir -p /opt/retail-example /opt/hopsandglory-staging
  sudo chown ubuntu:ubuntu /opt/retail-example /opt/hopsandglory-staging
  ```
  Or just run `scripts/provision-host.sh` on the box, which does Docker + dirs + firewall + clone.

---

## 2. DNS — Cloudflare

**Pre-flight before NS flip:**

```bash
dig MX hopsandglory.au        # capture existing MX (email protection)
dig TXT hopsandglory.au        # capture SPF/DKIM/DMARC already on domain
```

**In Cloudflare:**

- [ ] Add zone for `hopsandglory.au`
- [ ] Add A records pointing at VM IP (DNS-only, **not proxied** initially):
  - `hopsandglory.au → VM IP`
  - `www.hopsandglory.au → VM IP`
  - `staging.hopsandglory.au → VM IP`
- [ ] Add any existing email DNS records (MX, SPF) before NS flip
- [ ] Verify Caddy obtains Let's Encrypt cert before flipping nameservers
- [ ] Flip nameservers at registrar to Cloudflare
- [ ] Enable proxy mode (orange cloud) on apex + www after cert confirmed

---

## 3. Email — Resend

- [ ] Create Resend account and production API key
- [ ] Add domain `hopsandglory.au` in Resend → get DKIM, SPF, DMARC DNS records
- [ ] Add those records in Cloudflare DNS panel
- [ ] Verify domain shows "Verified" in Resend dashboard
- [ ] Set in `.env.production`:
  ```
  RESEND_API_KEY=re_live_...
  RESEND_FROM_EMAIL=orders@hopsandglory.au
  ```

---

## 4. Shipping

**ShipEngine:**

- [ ] Create production API key (separate from sandbox key)
- [ ] Add wallet funds for CouriersPlease (`se-*`) and Aramex AU (`se-*`)
- [ ] Generate `SHIPENGINE_WEBHOOK_SECRET` (32-byte random hex)
- [ ] Subscribe webhook in ShipEngine dashboard → `https://hopsandglory.au/webhooks/shipengine`
- [ ] Set in `.env.production`:
  ```
  SHIPENGINE_API_KEY=TEST_...
  SHIPENGINE_API_BASE=https://api.shipengine.com/v1
  SHIPENGINE_WEBHOOK_SECRET=<generated>
  ```

**AusPost:**

- [ ] Create MyPost Business account at auspost.com.au
- [ ] Obtain PAC (Parcel API Credentials) from AusPost business portal
- [ ] Set in `.env.production`:
  ```
  AUSPOST_API_KEY=...
  AUSPOST_ACCOUNT_NUMBER=...
  AUSPOST_ENABLED=true
  ```
- [ ] Enable AusPost in admin site-config after verifying live rates

---

## 5. Other API Keys

- [ ] **Google Maps**: Create production key restricted to `hopsandglory.au` domain → set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] **Sentry**: Create project `hopsandglory-backend` and `hopsandglory-storefront`
  - Set `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` in `.env.production`
- [ ] **Plausible**: Add `hopsandglory.au` domain to self-hosted Plausible instance at `analytics.hopsandglory.au`
  - Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=hopsandglory.au` in `.env.production`
  - Set `NEXT_PUBLIC_PLAUSIBLE_URL=https://analytics.hopsandglory.au` in `.env.production`

---

## 6. GitHub Actions Secrets

Create two environments in GH repo Settings → Environments:

**`staging` environment:**
| Secret | Value |
|--------|-------|
| `ORACLE_HOST` | VM IP address |
| `ORACLE_USER` | `ubuntu` (or your VM user) |
| `ORACLE_SSH_KEY` | Contents of SSH private key (PEM) |
| `GHCR_PULL_TOKEN` | GitHub PAT with `read:packages` scope |

**`production` environment:**

- Same 4 secrets as staging
- Add required reviewers (≥1 person)
- Protection rule: require approval before deploy

---

## 7. First Boot — Staging

```bash
# SSH into VM
ssh ubuntu@<VM_IP>

cd /opt/hopsandglory-staging
git clone https://github.com/sfc-gh-cmasterson/HandG.git .

# Copy and fill env file
cp .env.example .env.production
nano .env.production   # fill all values

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Run migrations
docker compose exec backend medusa db:migrate

# Seed (with test accounts for staging)
SEED_TEST_ACCOUNTS=true docker compose exec backend \
  medusa exec ./src/scripts/seed.ts

# Create admin user
docker compose exec backend medusa user \
  --email admin@hopsandglory.au \
  --password <strong_password>
```

Verify:

```bash
curl https://staging.hopsandglory.au/health
curl https://staging.hopsandglory.au/api/health
```

---

## 8. Smoke Tests Against Staging

```bash
export MEDUSA_BACKEND_URL=https://staging.hopsandglory.au
export ADMIN_EMAIL=admin@hopsandglory.au
export ADMIN_PASSWORD=<password>
export BACKEND_DIR=apps/backend

# Setup (creates smoke customers + resolves keys)
source <(bash scripts/smoke/ci-setup.sh)

# Run all smoke scripts
bash scripts/smoke/restock-alerts.sh
bash scripts/smoke/early-access.sh
bash scripts/smoke/product-alerts.sh
bash scripts/smoke/api-emails.sh
bash scripts/smoke/sprint-11b.sh
bash scripts/smoke/security.sh
```

---

## 9. Backup Cron

SSH into VM and install:

```bash
crontab -e
# Add:
0 2 * * * /opt/hopsandglory/scripts/backup-postgres.sh >> /var/log/hg-backup.log 2>&1
```

Test restore:

```bash
bash /opt/hopsandglory/scripts/restore-postgres.sh
```

---

## 10. Monitoring

- [ ] **UptimeRobot**: create HTTP(S) monitors:
  - `https://hopsandglory.au/health` — every 5 min, alert on 2 failures
  - `https://hopsandglory.au/` — every 5 min
- [ ] **securityheaders.com**: verify A grade on `https://staging.hopsandglory.au` before cutover
- [ ] **Sentry**: verify error events appear in dashboard after first page load
- [ ] **Plausible**: verify page view events appear

---

## 11. Production Cutover

1. Trigger `build-images.yml` on `main` → wait for `:staging` tag push to GHCR
2. Verify `deploy-staging.yml` completes green
3. Run smoke tests against staging (Section 8)
4. Trigger `deploy-prod.yml` (manual workflow dispatch):
   - Input: `image_tag: staging`
   - Requires production environment approval
5. Verify `https://hopsandglory.au/health` → 200
6. Run manual UAT: register → approve → checkout with PayID → VIP score
7. Monitor Sentry for 24h

**Rollback if needed:**

- Trigger `rollback-prod.yml` (manual) — retags `:previous` → `:prod` and redeploys

---

## 12. Manual UAT Checklist (requires browser, live backend)

- [ ] Registration flow: apply form → approval email → login
- [ ] Email-change flow: `/account/profile` → enter new email → click confirmation link → re-login with new email
- [ ] Password-change flow: `/account/profile` → change password → log out → log in with new password
- [ ] Delivery checkout: add to cart → checkout → enter address → select ShipEngine rate → PayID → confirm order
- [ ] VIP score: capture a PayID order → verify VIP score updates
- [ ] AusPost rates: enable in site-config → verify rates appear in checkout

---

## 13. Deferred Verification (needs live DB)

Run these queries against the staging DB after first boot:

```sql
-- Check no prices remain in cents (anything > 500 AUD is suspicious)
SELECT id, amount, currency_code FROM price
WHERE amount > 500 AND currency_code = 'aud'
ORDER BY amount DESC LIMIT 20;

-- Confirm network_spend_12mo column is gone
SELECT column_name FROM information_schema.columns
WHERE table_name = 'vip_score' AND column_name = 'network_spend_12mo';
-- Should return 0 rows.

-- Optional cleanup: drop product_like table (only if no rows remain)
SELECT COUNT(*) FROM product_like;
-- If 0: DROP TABLE product_like;
```
