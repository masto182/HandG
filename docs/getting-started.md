# Getting started

A 5-minute walkthrough that takes a fresh clone to a running stack with
seed data.

## 0. Prerequisites

- macOS / Linux (Windows: use WSL2)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or
  any Docker Engine ≥ 24
- [fnm](https://github.com/Schniz/fnm) (Node version manager) **or**
  Node 20.20.2 already on `PATH`
- [pnpm](https://pnpm.io) 10.33.2 (`corepack enable` is enough — don't
  install pnpm globally)
- [just](https://just.systems) (optional but recommended)

```bash
fnm install 20.20.2 && fnm use 20.20.2
corepack enable && corepack prepare pnpm@10.33.2 --activate
```

## 1. Clone + bootstrap

The fastest path uses the `justfile`:

```bash
git clone https://github.com/sfc-gh-cmasterson/Retail-online-store-example-for-migration.git retail
cd retail
just bootstrap
```

`just bootstrap` runs:
- `cp .env.example .env` (and the same for backend + storefront)
- `pnpm install`
- `docker compose up -d` (Postgres, Redis, MeiliSearch, MinIO)
- `pnpm exec medusa db:migrate`
- creates an admin user (`admin@example.test` / `ChangeMe123!`)
- runs the consolidated `seed.ts`

Without `just`, do it manually — see `justfile` for the equivalent
commands.

## 2. Run the apps

```bash
pnpm dev
```

This starts both the backend (port 9000) and the storefront (port
8000) under Turbo. The first run takes ~30–60 seconds while the
storefront compiles.

| URL                                | Purpose          |
| ---------------------------------- | ---------------- |
| http://localhost:8000              | Storefront       |
| http://localhost:9000/admin        | Admin UI         |
| http://localhost:9000/store/products | Backend API     |
| http://localhost:7700              | MeiliSearch UI   |
| http://localhost:9101              | MinIO console    |

Sign in to admin with `admin@example.test` / `ChangeMe123!`.

## 3. Generate a publishable key

The storefront needs a Medusa publishable API key:

1. Admin UI → **Settings → Publishable API Keys → Create**
2. Copy the key
3. Paste into `apps/storefront/.env.local` as
   `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
4. Restart the storefront (`Ctrl-C` then `pnpm dev`)

## 4. (Optional) test accounts

If you want pre-built customer accounts for demo / E2E:

```bash
SEED_TEST_ACCOUNTS=true \
  pnpm --filter ./apps/backend exec medusa exec ./src/scripts/seed.ts
```

Creates `approved@example.test`, `vip@example.test`,
`pending@example.test` (passwords in the script).

## 5. What next?

- [Configuration](./configuration.md) — wire up real email, payments,
  shipping
- [Modules](./modules.md) — strip the demo modules you don't need
- [Storage](./storage.md) — replace MinIO with R2 / S3 / B2
- [Deployment](./deployment.md) — push to a real host

## Reset everything

If your local state gets weird:

```bash
just nuke           # docker compose down -v (destroys volumes)
just bootstrap      # start fresh
```
