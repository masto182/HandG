# Deployment

This repo ships one production-ready deployment pattern out of the
box: a single VM running `docker-compose.prod.yml` with **Caddy** in
front for TLS and reverse proxying. Everything is portable — the same
images run on Kubernetes, ECS, Fly, or Railway with minor adjustments.

## Reference architecture

- 1× VM (any cloud) with Docker installed
- Postgres, Redis, MeiliSearch run on the same VM in containers (or
  swap to managed services)
- Caddy fronts the stack on `:443` and `:80`
- Images pulled from `ghcr.io/sfc-gh-cmasterson/{backend,storefront}`
- DNS apex + `www.` pointed at the VM

## Image lifecycle

```
push to main → build-images.yml builds linux/arm64 → tags
                ghcr.io/sfc-gh-cmasterson/{backend,storefront}:staging
                ghcr.io/sfc-gh-cmasterson/{backend,storefront}:sha-<short>

deploy-staging.yml fires automatically on the build's success
        SSH-deploys to /opt/retail-example-staging
        docker compose pull + up -d + medusa db:migrate
        health probe against /health/ready + /api/health/ready

(human-driven) deploy-prod.yml workflow_dispatch
        Verifies source tag exists in registry
        Stashes existing :prod as :previous
        Retags chosen tag → :prod
        Requires production environment approval (1 reviewer)
        SSH-deploys to /opt/retail-example
        Health probes /ready endpoints

rollback-prod.yml workflow_dispatch
        Swaps :previous → :prod
        Redeploys
```

## First deploy

1. Provision a VM (Oracle Cloud Always Free works; any 2-vCPU box works)
2. Install Docker + Docker Compose
3. Configure DNS:
   - `example.com` A → VM IP
   - `www.example.com` A → VM IP
4. SSH in:
   ```bash
   sudo mkdir -p /opt/retail-example /opt/retail-example-staging
   cd /opt/retail-example
   git clone https://github.com/sfc-gh-cmasterson/Retail-online-store-example-for-migration.git .
   ```
5. Create `.env.production` from `.env.example` (fill in real secrets)
6. Open ports `:80` and `:443` only
7. Run a one-off `docker compose -f docker-compose.prod.yml up -d` to
   verify Caddy obtains a Let's Encrypt cert
8. Set GitHub Actions secrets / vars (see
   [branch-protection.md](./runbooks/branch-protection.md))
9. Push a commit to `main` → staging deploys → kick `deploy-prod.yml`
   when ready

## Caddy

`Caddyfile` is intentionally short. It defines:

- `(security_headers)` snippet (HSTS, X-Frame-Options, etc.)
- `www.{$DOMAIN}` → 301 to apex
- `{$DOMAIN}` apex with three handlers:
  1. `/health*` → backend
  2. `/store*`, `/admin*`, `/auth*`, `/webhooks*` → backend
  3. everything else → storefront
- `{$STAGING_DOMAIN}` mirror with `X-Robots-Tag: noindex, nofollow`

Caddy auto-renews certs and is the **single source of truth for HSTS**.
The storefront middleware deliberately does not set HSTS to avoid
double-headers.

## Production env vars

See [configuration.md](./configuration.md#production-only-env). The
mandatory ones are:

- `PRIMARY_DOMAIN`
- All backend `apps/backend/.env.example` vars
- `PUBLISHABLE_KEY` (build-time arg for the storefront)

## Migrations on deploy

`deploy-staging.yml` runs `medusa db:migrate` after `up -d` and
swallows failures so a stuck migration doesn't take down staging.
`deploy-prod.yml` runs the same migration but **fails the deploy** on
error — your release goes red until you intervene. Pass
`skip_migrations: true` to the workflow input for hotfixes that don't
touch schema.

## Alternative deployment shapes

### Managed Postgres + Redis

Replace the `postgres:` and `redis:` services in
`docker-compose.prod.yml` with `extra_hosts:` entries pointing at your
managed instances. Update `DATABASE_URL` and `REDIS_URL`. Drop the
volumes.

### Kubernetes

Each container in `docker-compose.prod.yml` maps to a Deployment +
Service. Use the same images. Front with an Ingress controller (NGINX,
Traefik, or Caddy-Ingress) instead of the bundled Caddy.
`/health/live` is your liveness, `/health/ready` is your readiness.

### Fly / Railway / Render

Both `apps/backend/Dockerfile` and `apps/storefront/Dockerfile` build
cleanly with no external assumptions; point the platform at them.
Wire env vars via the platform's secret manager. Use the platform's
managed Postgres/Redis offering.

## Cutover checklist

- [ ] DNS changes propagated (`dig +short example.com`)
- [ ] First deploy to production succeeded with green `/ready` probes
- [ ] Renovate dashboard issue exists
- [ ] Branch protection on `main` (1 approval; status checks required)
- [ ] Production environment requires reviewer
- [ ] GHCR image package is **public** (or pull token configured)
- [ ] Sentry org / project created (optional)
- [ ] Backup cron for Postgres scheduled
- [ ] UptimeRobot or equivalent watching `/health/ready`
- [ ] Sender domain verified with Resend (or whichever email provider)
