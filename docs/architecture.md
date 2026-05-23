# Architecture

A high-level tour of the stack. Read this first if you want to know how
the pieces fit together before changing any of them.

## Repo shape

```
.
├── apps/
│   ├── backend/         Medusa v2 server + admin UI
│   └── storefront/      Next.js 15 (App Router, RSC)
├── packages/
│   └── shared-types/    Types shared by backend + storefront
├── docker-compose.yml         Local dev infra
├── docker-compose.prod.yml    Production stack (adds Caddy)
├── Caddyfile                  Reverse proxy
└── turbo.json                 Build pipeline
```

Two apps, three workspaces, one Turbo pipeline. Builds and tests run in
parallel; the `shared-types` package is rebuilt only when its inputs
change.

## Runtime topology

```
                    ┌──────────────────────┐
                    │     Caddy 2.8        │  443 + 80 + Let's Encrypt
                    │  (reverse proxy)     │
                    └─────────┬────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
│  Storefront  │    │    Backend     │    │   Admin UI       │
│  Next.js 15  │    │   Medusa v2    │    │  (served by      │
│  port 3000   │    │   port 9000    │    │   backend)       │
└──────┬───────┘    └────────┬───────┘    └──────────────────┘
       │                     │
       │ /store, /auth via SDK
       │                     │
       │           ┌─────────┼─────────┬───────────────┐
       │           ▼         ▼         ▼               ▼
       │     ┌────────┐ ┌───────┐ ┌──────────┐ ┌────────────┐
       │     │Postgres│ │ Redis │ │ MeiliSrch│ │ S3-compat  │
       │     │  16    │ │  7    │ │  v1.12   │ │ object     │
       │     └────────┘ └───────┘ └──────────┘ │ storage    │
       │                                       └────────────┘
       └────── next/image, RSC fetches ────────────►
```

All services live on a single docker-compose `app-network`. Caddy is the
**only** container with public ports; everything else listens on the
internal bridge.

## Request flow (read path)

1. User hits `https://example.com/products/foo`
2. Caddy terminates TLS and proxies to `storefront:3000`
3. Next.js renders the route as an RSC. Inside the server component the
   storefront calls `${MEDUSA_BACKEND_URL}/store/products?handle=foo`
4. Medusa hydrates the product, applies tier-based redaction
   (see `apps/backend/src/api/store/middlewares/`), and returns JSON
5. Storefront streams HTML back through Caddy

## Request flow (write path — checkout)

1. Client-side React Query hook calls `sdk.store.cart.create()`
2. SDK posts to `/store/carts` with the `x-publishable-api-key` header
3. Backend creates the cart, runs `defineMiddlewares` for that route
   (rate-limit, validate, etc.), and persists to Postgres
4. Event bus publishes `cart.created`; subscribers (e.g. notification
   preference) react asynchronously via Redis

## Data model boundary

- Medusa core handles: products, variants, prices, regions, sales
  channels, customers, carts, orders, fulfilment, payment.
- Custom modules (in `apps/backend/src/modules/`) layer on retail
  specifics: pickup locations, VIP tiers, wishlists, referrals,
  PayID payments, etc. Each module is self-contained — drop the
  directory, remove the entry from `medusa-config.ts`, delete its
  migrations, done.

See [modules.md](./modules.md) for the per-module breakdown.

## Build pipeline

`turbo` orchestrates `build`, `lint`, `typecheck`, `test`, `clean`
across both apps with caching. The pipeline is wired so that
`apps/storefront#build` waits for `packages/shared-types#build` to
finish but does **not** wait for `apps/backend#build`.

## Deployment topology

A single VM (or a Kubernetes namespace) runs the production
docker-compose stack. There is **no** orchestrator-side blue/green —
zero-downtime deploys are achieved by Caddy keeping connections to the
old container open while the new one warms up its `/health/ready`
probe.

Image promotion goes:

```
build-images.yml → :sha-<short> + :staging
deploy-staging.yml → pulls :staging
deploy-prod.yml → retags :staging → :prod (after manual approval)
                  pulls :prod and bounces compose
                  stashes the previous :prod as :previous (for rollback)
rollback-prod.yml → swaps :previous back to :prod
```

See [deployment.md](./deployment.md) for the full lifecycle.
