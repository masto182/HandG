# Retail example — task runner.
# Run `just` to list recipes. Anything that starts with `_` is private.
#
# Install just: brew install just  (or see https://just.systems)

set shell := ["bash", "-cu"]
set dotenv-load := false

backend := "./apps/backend"
storefront := "./apps/storefront"

# Default: list recipes
default:
    @just --list

# ---- Bootstrap ---------------------------------------------------------------

# One-shot bootstrap: env + install + infra + migrate + seed + wire publishable key
bootstrap: copy-env gen-secrets install up migrate seed wire-publishable-key
    @echo ""
    @echo "✔  Bootstrap complete."
    @echo "   Backend:    http://localhost:9000"
    @echo "   Admin:      http://localhost:9000/app"
    @echo "   Storefront: http://localhost:8000  (start with: just dev)"

# Replace placeholder JWT_SECRET / COOKIE_SECRET in apps/backend/.env with real values
gen-secrets:
    @F={{backend}}/.env; \
    if grep -q '^JWT_SECRET=replace-me' $F; then \
      JWT=$(openssl rand -hex 32); \
      sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$JWT|" $F && rm -f $F.bak; \
      echo "gen-secrets: JWT_SECRET set"; \
    else echo "gen-secrets: JWT_SECRET already set, skipping"; fi; \
    if grep -q '^COOKIE_SECRET=replace-me' $F; then \
      COOKIE=$(openssl rand -hex 32); \
      sed -i.bak "s|^COOKIE_SECRET=.*|COOKIE_SECRET=$COOKIE|" $F && rm -f $F.bak; \
      echo "gen-secrets: COOKIE_SECRET set"; \
    else echo "gen-secrets: COOKIE_SECRET already set, skipping"; fi

# Pull the seeded publishable API key from Postgres into apps/storefront/.env.local
wire-publishable-key:
    @KEY=$(docker compose exec -T postgres psql -U medusa -d medusa -At -c "SELECT token FROM api_key WHERE type='publishable' AND revoked_at IS NULL ORDER BY created_at LIMIT 1;" | tr -d '\r'); \
    if [ -z "$KEY" ]; then echo "wire-publishable-key: no publishable key found in DB"; exit 1; fi; \
    F={{storefront}}/.env.local; \
    if grep -q '^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=' $F; then \
      sed -i.bak "s|^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$KEY|" $F && rm -f $F.bak; \
    else \
      printf "\nNEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=%s\n" "$KEY" >> $F; \
    fi; \
    echo "wire-publishable-key: storefront publishable key set"

# Copy .env.example files to .env (no overwrite)
copy-env:
    @[ -f .env ] || cp .env.example .env
    @[ -f {{backend}}/.env ] || cp {{backend}}/.env.example {{backend}}/.env
    @[ -f {{storefront}}/.env.local ] || cp {{storefront}}/.env.example {{storefront}}/.env.local

# Install workspace dependencies
install:
    pnpm install --frozen-lockfile

# ---- Infra (docker compose) -------------------------------------------------

# Start dev infrastructure (postgres, redis, meili, minio)
up:
    docker compose up -d
    @echo "Waiting for infra to be healthy..."
    @sleep 3

# Stop infrastructure (keep volumes)
down:
    docker compose down

# Stop infrastructure and remove all volumes (destroys data)
nuke:
    docker compose down -v

# Tail compose logs
logs service="":
    @if [ -z "{{service}}" ]; then docker compose logs -f --tail=200; \
    else docker compose logs -f --tail=200 {{service}}; fi

# ---- Backend -----------------------------------------------------------------

# Run all migrations
migrate:
    pnpm --filter {{backend}} exec medusa db:migrate

# Generate a new migration for one module
migration name:
    pnpm --filter {{backend}} exec medusa db:generate {{name}}

# Run consolidated seed
seed:
    pnpm --filter {{backend}} exec medusa exec ./src/scripts/seed.ts

# Run the e2e fixture chain (vip-config + beer-styles + hops + e2e products).
# Not part of `bootstrap` — production stays product-free.
seed-e2e:
    pnpm --filter {{backend}} exec medusa exec ./src/scripts/seed-vip-config.ts
    pnpm --filter {{backend}} exec medusa exec ./src/scripts/seed-beer-styles.ts
    pnpm --filter {{backend}} exec medusa exec ./src/scripts/seed-hops.ts
    pnpm --filter {{backend}} exec medusa exec ./src/scripts/seed-e2e-products.ts

# Re-stamp the VIP-window release_at values without touching styles/hops.
# Useful when fixture timestamps have drifted past their window.
seed-e2e-refresh-windows:
    pnpm --filter {{backend}} exec medusa exec ./src/scripts/seed-e2e-products.ts

# Create an admin user
admin email="admin@example.test" password="ChangeMe123!":
    pnpm --filter {{backend}} exec medusa user -e {{email}} -p {{password}}

# Reset DB and re-seed (DESTRUCTIVE)
reset-db: nuke up
    @sleep 5
    just migrate
    just admin
    just seed
    just wire-publishable-key

# ---- Dev / build / test -----------------------------------------------------

# Start backend + storefront in dev (turbo)
dev:
    pnpm dev

# Start only the backend
dev-backend:
    pnpm --filter {{backend}} dev

# Start only the storefront
dev-storefront:
    pnpm --filter {{storefront}} dev

# Lint everything
lint:
    pnpm lint

# Typecheck everything
typecheck:
    pnpm typecheck

# Run all tests
test:
    pnpm test

# Build everything (turbo)
build:
    pnpm build

# Format with prettier
fmt:
    pnpm format

# Check formatting without writing
fmt-check:
    pnpm format:check

# ---- Storybook --------------------------------------------------------------

# Run Storybook dev server (port 6006)
storybook:
    pnpm --filter {{storefront}} storybook

# Build static Storybook
build-storybook:
    pnpm --filter {{storefront}} build-storybook

# ---- Smoke tests ------------------------------------------------------------
# Requires a running backend on :9000 + env vars set (see scripts/smoke/helpers.sh).
# Quickstart: export MEDUSA_PUBLISHABLE_KEY=<key> CUSTOMER_JWT=<token> VIP5_JWT=<token> TEST_PRODUCT_ID=<id>

# Run all smoke scripts
smoke: smoke-restock smoke-early-access smoke-product-alerts smoke-api-emails
    @echo "✔  All smoke scripts passed."

# Restock alert: subscribe → detect → cron dispatch → verified
smoke-restock:
    bash scripts/smoke/restock-alerts.sh

# Early-access gate: approved → 409, VIP5 → 201, gate lifted → 201
smoke-early-access:
    bash scripts/smoke/early-access.sh

# Product alerts: new-drop, wishlist low-stock, wishlist price alert
smoke-product-alerts:
    bash scripts/smoke/product-alerts.sh

# API email routes: ready-for-pickup, email-change-request, check-price-alert
smoke-api-emails:
    bash scripts/smoke/api-emails.sh

# ---- Quality gates ----------------------------------------------------------

# Run the gates that block CI
ci: lint typecheck build test
    @echo "✔  All CI gates passed locally."

# ---- Docker images ----------------------------------------------------------

# Build production images locally (linux/arm64)
build-images:
    docker buildx build --platform linux/arm64 -f {{backend}}/Dockerfile -t retail-example/backend:local .
    docker buildx build --platform linux/arm64 -f {{storefront}}/Dockerfile -t retail-example/storefront:local .

# ---- Cleanup ----------------------------------------------------------------

# Remove all build outputs and node_modules
clean:
    pnpm clean
    rm -rf node_modules apps/*/node_modules packages/*/node_modules
    rm -rf apps/*/.next apps/*/.turbo apps/*/.medusa
