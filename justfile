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

# One-shot bootstrap: env + install + infra + migrate + seed
bootstrap: copy-env install up migrate seed
    @echo ""
    @echo "✔  Bootstrap complete."
    @echo "   Backend:    http://localhost:9000"
    @echo "   Admin:      http://localhost:9000/admin"
    @echo "   Storefront: http://localhost:8000  (start with: just dev)"

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

# Create an admin user
admin email="admin@example.test" password="ChangeMe123!":
    pnpm --filter {{backend}} exec medusa user -e {{email}} -p {{password}}

# Reset DB and re-seed (DESTRUCTIVE)
reset-db: nuke up
    @sleep 5
    just migrate
    just admin
    just seed

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
