#!/usr/bin/env bash
#
# e2e-local-ci.sh — run the Playwright E2E suite locally with CI parity.
#
# WHY THIS EXISTS
# ---------------
# The nightly E2E job (.github/workflows/e2e-nightly.yml) runs against a
# *production* backend (`medusa build` + `medusa start`) over plain http, with
# a freshly seeded database. Running locally with `medusa develop` (dev mode)
# hides whole classes of failures that only appear in production mode, e.g.:
#   - Secure session cookies dropped over http  -> admin login 401
#   - worker/event timing differences           -> rows not yet propagated
# This script reproduces the CI environment so that "passes locally" actually
# means "will pass in CI".
#
# WHAT IT MIRRORS (see e2e-nightly.yml)
#   - postgres / redis / meilisearch / minio via docker compose
#   - medusa build  -> medusa start  (PRODUCTION backend, from .medusa/server)
#   - COOKIE_SECURE=false so the http admin session cookie is accepted
#   - full seed chain + CI publishable key (captured, then storefront built with it)
#   - next build + next start (or standalone server) on :8000
#   - playwright test
#
# USAGE
#   scripts/e2e-local-ci.sh                 # full suite
#   scripts/e2e-local-ci.sh buy-now.spec.ts # a subset (passed through to playwright)
#   FRESH_DB=1 scripts/e2e-local-ci.sh      # drop & recreate the DB first (true CI parity)
#
# Requires: docker, fnm (node 20.20.2), pnpm. Run from the repo root.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="/opt/homebrew/bin:$PATH"
eval "$(fnm env)" >/dev/null 2>&1 || true
fnm use 20.20.2 >/dev/null 2>&1 || true

PG_CONTAINER="${PG_CONTAINER:-handg-postgres-1}"
PG_DB="${PG_DB:-medusa}"
PG_USER="${PG_USER:-medusa}"
BACKEND_DIR="$ROOT/apps/backend"
STOREFRONT_DIR="$ROOT/apps/storefront"
SERVER_DIR="$BACKEND_DIR/.medusa/server"

log() { printf "\n\033[1;36m[ci-parity]\033[0m %s\n" "$*"; }

cleanup() {
  log "Stopping local servers (backend :9000, storefront :8000)…"
  lsof -nP -ti tcp:9000 -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -nP -ti tcp:8000 -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
}
trap cleanup EXIT

# 1. Infra ------------------------------------------------------------------
log "Bringing up docker infra (postgres/redis/meilisearch/minio)…"
docker compose up -d >/dev/null
for i in $(seq 1 30); do
  docker exec "$PG_CONTAINER" pg_isready -U "$PG_USER" >/dev/null 2>&1 && break
  sleep 1
done

if [ "${FRESH_DB:-0}" = "1" ]; then
  log "FRESH_DB=1 → dropping and recreating '$PG_DB' (true CI parity)…"
  docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS $PG_DB WITH (FORCE);" >/dev/null
  docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d postgres \
    -c "CREATE DATABASE $PG_DB;" >/dev/null
fi

# 2. Build (shared-types + production backend) ------------------------------
log "Building shared-types + backend (production)…"
pnpm --filter @retail-example/shared-types build >/dev/null
pnpm --filter ./apps/backend build >/dev/null

# 3. Migrate + seed ---------------------------------------------------------
if [ "${FRESH_DB:-0}" = "1" ]; then
  log "Migrating + seeding (SEED_TEST_ACCOUNTS=true)…"
  SEED_TEST_ACCOUNTS=true pnpm --filter ./apps/backend exec medusa db:migrate
  SEED_TEST_ACCOUNTS=true pnpm --filter ./apps/backend exec medusa exec ./src/scripts/seed.ts
  pnpm --filter ./apps/backend exec medusa user \
    --email "${E2E_ADMIN_EMAIL:-admin@example.test}" \
    --password "${E2E_ADMIN_PASSWORD:-ChangeMe123!}" || true
fi

# 4. CI publishable key — capture, then build storefront WITH it ------------
log "Creating CI publishable key…"
pnpm --filter ./apps/backend exec medusa exec ./src/scripts/create-ci-publishable-key.ts \
  > /tmp/pubkey.txt 2>/dev/null || true
PUBKEY="$(grep '^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=' /tmp/pubkey.txt | head -1 | cut -d= -f2- || true)"
if [ -z "$PUBKEY" ]; then
  # Reuse the existing key from storefront/.env.local if the script returned none.
  PUBKEY="$(grep '^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=' "$STOREFRONT_DIR/.env.local" 2>/dev/null | head -1 | cut -d= -f2- || true)"
fi
log "Publishable key: ${PUBKEY:0:18}…"

# 5. Start PRODUCTION backend (medusa start) from .medusa/server ------------
# Mirror the CI working-directory + COOKIE_SECURE=false (http admin) parity.
log "Starting production backend (medusa start)…"
cp "$BACKEND_DIR/.env" "$SERVER_DIR/.env" 2>/dev/null || true
grep -q '^COOKIE_SECURE=' "$SERVER_DIR/.env" 2>/dev/null || echo "COOKIE_SECURE=false" >> "$SERVER_DIR/.env"
lsof -nP -ti tcp:9000 -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
( cd "$SERVER_DIR" && ../../node_modules/.bin/medusa start > /tmp/be-prod.log 2>&1 & )
for i in $(seq 1 60); do
  curl -sf "http://localhost:9000/health" >/dev/null 2>&1 && { log "backend healthy"; break; }
  sleep 2
done

# 6. Post-start seed steps (mirror CI) --------------------------------------
log "Reindex search + seed E2E products…"
pnpm --filter ./apps/backend exec medusa exec ./src/scripts/reindex-search.ts >/dev/null 2>&1 || true
pnpm --filter ./apps/backend exec medusa exec ./src/scripts/seed-e2e-products.ts >/dev/null 2>&1 || true

# 7. Build + start storefront (production) ----------------------------------
log "Building storefront (production) with the captured key…"
( cd "$STOREFRONT_DIR" && NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$PUBKEY" pnpm build >/dev/null )
log "Starting storefront (next start :8000)…"
lsof -nP -ti tcp:8000 -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
( cd "$STOREFRONT_DIR" && NEXT_REWRITES_BACKEND=http://localhost:9000 \
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY="$PUBKEY" \
    pnpm exec next start -p 8000 > /tmp/storefront.log 2>&1 & )
for i in $(seq 1 45); do
  curl -s -o /dev/null "http://localhost:8000/" && break
  sleep 2
done

# 8. Run Playwright ---------------------------------------------------------
log "Running Playwright (SKIP_E2E_SEED=true; args: ${*:-<full suite>})…"
cd "$STOREFRONT_DIR"
SKIP_E2E_SEED=true pnpm exec playwright test "$@"
