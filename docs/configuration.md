# Configuration

Every environment variable used by the stack, grouped by where it lives.

> All `.env.example` files are committed. Run `just copy-env` to seed
> local `.env` / `.env.local` / `.env` files from them.

## Required vs optional

A variable marked **required** must be set before the corresponding
service will boot. Optional variables disable a feature when absent
(e.g. `RESEND_API_KEY` empty → emails are logged, not sent).

## Root `.env`

Used by `docker-compose.yml` only.

| Variable              | Required | Default                   | Notes                              |
| --------------------- | -------- | ------------------------- | ---------------------------------- |
| `POSTGRES_USER`       | yes      | `medusa`                  |                                    |
| `POSTGRES_PASSWORD`   | yes      | `medusa_dev_password`     | rotate before any non-dev use      |
| `POSTGRES_DB`         | yes      | `medusa`                  |                                    |
| `MEILI_MASTER_KEY`    | yes      | `meili_dev_master_key`    | `openssl rand -hex 32` for prod    |
| `MINIO_ROOT_USER`     | yes      | `medusa`                  |                                    |
| `MINIO_ROOT_PASSWORD` | yes      | `medusa_minio_dev_pass…`  |                                    |

## Backend `apps/backend/.env`

### Database / cache / search

| Variable                | Required | Notes                                              |
| ----------------------- | -------- | -------------------------------------------------- |
| `DATABASE_URL`          | yes      | Postgres connection string. Use `sslmode=require` in prod |
| `REDIS_URL`             | yes      |                                                    |
| `MEILI_HOST`            | yes      |                                                    |
| `MEILI_MASTER_KEY`      | yes      |                                                    |
| `MEDUSA_FF_INDEX_ENGINE`| no       | `true` to enable Medusa's index engine            |

### Auth secrets

Both fail-fast in production via `requireEnv` in
`apps/backend/src/lib/env.ts`.

| Variable        | Required | How to generate            |
| --------------- | -------- | -------------------------- |
| `JWT_SECRET`    | yes      | `openssl rand -hex 32`     |
| `COOKIE_SECRET` | yes      | `openssl rand -hex 32`     |

### Server / admin

| Variable               | Required | Default      | Notes                                  |
| ---------------------- | -------- | ------------ | -------------------------------------- |
| `MEDUSA_WORKER_MODE`   | no       | `shared`     | `worker` for the worker container in a split topology |
| `DISABLE_MEDUSA_ADMIN` | no       | `false`      |                                        |
| `MEDUSA_ADMIN_PATH`    | no       | `/admin`     | set to a non-obvious path to obscure   |
| `MEDUSA_BACKEND_URL`   | yes      |              | the canonical URL for admin assets     |

### CORS — comma-separated origins

| Variable      | Required | Notes                                  |
| ------------- | -------- | -------------------------------------- |
| `STORE_CORS`  | yes      | storefront origins                     |
| `ADMIN_CORS`  | yes      | admin origins                          |
| `AUTH_CORS`   | yes      | union of the two for auth callbacks    |

### Storage

See [storage.md](./storage.md) for provider-specific recipes.

| Variable        | Required | Notes                                    |
| --------------- | -------- | ---------------------------------------- |
| `S3_ENDPOINT`   | yes      |                                          |
| `S3_FILE_URL`   | yes      | public URL prefix the storefront fetches |
| `S3_REGION`     | yes      | `auto` for R2                            |
| `S3_BUCKET`     | yes      |                                          |
| `S3_ACCESS_KEY` | yes      |                                          |
| `S3_SECRET_KEY` | yes      |                                          |

### Email

| Variable          | Required | Notes                         |
| ----------------- | -------- | ----------------------------- |
| `RESEND_API_KEY`  | no       | empty → emails logged, not sent |
| `RESEND_FROM`     | no       | must be a verified sender     |

### Observability

| Variable     | Required | Notes                                  |
| ------------ | -------- | -------------------------------------- |
| `SENTRY_DSN` | no       | empty → Sentry is a no-op              |

### Catalog intelligence

| Variable         | Required | Notes |
| ---------------- | -------- | ----- |
| `OPENAI_API_KEY` | no       |       |

### Payment / shipping providers

| Variable                  | Required | Notes                                |
| ------------------------- | -------- | ------------------------------------ |
| `PAYID_ALIAS`             | no       | drop the module if you don't use PayID |
| `PAYID_HOLD_HOURS`        | no       | default 72                           |
| `SHIPENGINE_API_KEY`      | no       |                                      |
| `SHIPENGINE_API_BASE`     | no       |                                      |
| `SHIPENGINE_CARRIER_IDS`  | no       | comma-separated                      |
| `AUSPOST_API_KEY`         | no       |                                      |
| `AUSPOST_API_BASE`        | no       |                                      |

### Seed configuration

Consumed by `apps/backend/src/scripts/seed.ts`.

| Variable              | Required | Default            | Notes |
| --------------------- | -------- | ------------------ | ----- |
| `BRAND_NAME`          | no       | `Retail Example`   |       |
| `DEFAULT_CURRENCY`    | no       | `usd`              |       |
| `DEFAULT_COUNTRY`     | no       | `us`               |       |
| `DEFAULT_REGION_NAME` | no       | derived            |       |
| `SEED_TEST_ACCOUNTS`  | no       | empty              | `true` to create demo customers |

## Storefront `apps/storefront/.env.local`

Anything prefixed `NEXT_PUBLIC_` is bundled into the browser at build
time. **Never put secrets there.**

| Variable                              | Required | Notes                                 |
| ------------------------------------- | -------- | ------------------------------------- |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL`      | yes      |                                       |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`  | yes      | from admin UI                         |
| `NEXT_PUBLIC_BASE_URL`                | yes      |                                       |
| `NEXT_PUBLIC_STORE_URL`               | yes      | used by `json-ld`/`sitemap`           |
| `STOREFRONT_IMAGE_HOSTS`              | yes      | comma-separated; CSP **and** `next/image` read this |
| `NEXT_PUBLIC_PAYID_ALIAS`             | no       |                                       |
| `NEXT_PUBLIC_SENTRY_DSN`              | no       | empty → Sentry no-op                  |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`        | no       |                                       |
| `NEXT_PUBLIC_PLAUSIBLE_SRC`           | no       |                                       |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`     | no       | for address autocomplete              |

## Production-only env

When deploying with `docker-compose.prod.yml`:

| Variable             | Used by                | Notes                          |
| -------------------- | ---------------------- | ------------------------------ |
| `PRIMARY_DOMAIN`     | Caddy + backend env    | apex domain (no scheme)        |
| `STAGING_DOMAIN`     | Caddy                  | optional staging hostname      |
| `BACKEND_IMAGE`      | compose                | overrides `:prod` tag          |
| `STOREFRONT_IMAGE`   | compose                |                                |
| `EMAIL_FROM`         | backend                |                                |
| `PUBLISHABLE_KEY`    | storefront build args  | injected at build time         |
