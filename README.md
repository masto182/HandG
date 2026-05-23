# Retail online store example for migration

[![CI](https://github.com/sfc-gh-cmasterson/Retail-online-store-example-for-migration/actions/workflows/ci.yml/badge.svg)](https://github.com/sfc-gh-cmasterson/Retail-online-store-example-for-migration/actions/workflows/ci.yml)
[![Security](https://github.com/sfc-gh-cmasterson/Retail-online-store-example-for-migration/actions/workflows/security.yml/badge.svg)](https://github.com/sfc-gh-cmasterson/Retail-online-store-example-for-migration/actions/workflows/security.yml)
[![Lighthouse](https://github.com/sfc-gh-cmasterson/Retail-online-store-example-for-migration/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/sfc-gh-cmasterson/Retail-online-store-example-for-migration/actions/workflows/lighthouse.yml)
[![Release](https://github.com/sfc-gh-cmasterson/Retail-online-store-example-for-migration/actions/workflows/release.yml/badge.svg)](https://github.com/sfc-gh-cmasterson/Retail-online-store-example-for-migration/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20.20.2-339933?logo=node.js&logoColor=white)](.node-version)
[![pnpm](https://img.shields.io/badge/pnpm-10.33.2-F69220?logo=pnpm&logoColor=white)](package.json)
[![Medusa](https://img.shields.io/badge/Medusa-v2-7C3AED)](https://docs.medusajs.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js)](https://nextjs.org)

A reference monorepo for migrating retail e-commerce workloads onto a
modern, container-friendly stack. Built with **Medusa v2** + **Next.js
15** + **Postgres** + **Redis** + **MeiliSearch** + S3-compatible
storage. Clone it, swap in your data, and ship.

## Architecture

```
.
├── apps/
│   ├── backend/         Medusa v2          (port 9000)
│   └── storefront/      Next.js 15         (port 8000)
├── packages/
│   └── shared-types/    Shared TS types
├── docker-compose.yml         Local dev infra (Postgres, Redis, Meili, MinIO)
├── docker-compose.prod.yml    Production stack (adds Caddy edge)
├── Caddyfile                  Single-domain reverse proxy
├── pnpm-workspace.yaml
└── turbo.json
```

## Prerequisites

- Node.js **20.20.2** (managed via [`fnm`](https://github.com/Schniz/fnm) — see `.node-version`)
- pnpm **10.33.2** (`corepack enable`)
- Docker & Docker Compose

## Quick start

```bash
# 1. Start infrastructure
cp .env.example .env
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Backend env
cp apps/backend/.env.example apps/backend/.env
# Generate secrets: openssl rand -hex 32 (JWT_SECRET, COOKIE_SECRET)

# 4. Storefront env
cp apps/storefront/.env.example apps/storefront/.env.local

# 5. Migrate + seed
cd apps/backend
pnpm exec medusa db:migrate
pnpm exec medusa user -e admin@example.test -p ChangeMe123!
pnpm exec medusa exec ./src/scripts/seed.ts

# 6. Run the stack
cd ../..
pnpm dev
```

## Services

| Service     | URL                        | Purpose          |
| ----------- | -------------------------- | ---------------- |
| Backend     | http://localhost:9000      | Medusa API       |
| Admin       | http://localhost:9000/admin| Admin dashboard  |
| Storefront  | http://localhost:8000      | Customer-facing  |
| PostgreSQL  | localhost:5432             | Database         |
| Redis       | localhost:6379             | Cache / events   |
| MeiliSearch | http://localhost:7700      | Full-text search |
| MinIO       | http://localhost:9100      | S3-compatible storage |

## Documentation

- `docs/runbooks/` — deploy, incident response, branch protection
- `SECURITY.md` — vulnerability reporting policy
- `apps/backend/.env.example` — full env reference

## Releases

Versioning is automated by [release-please](https://github.com/googleapis/release-please)
using [conventional commits](https://www.conventionalcommits.org). Merge
a PR with a `feat:` or `fix:` commit and a release PR will appear; merging
that release PR cuts a tag, updates `CHANGELOG.md`, and triggers the
production image build.

## License

MIT — see [LICENSE](LICENSE).
