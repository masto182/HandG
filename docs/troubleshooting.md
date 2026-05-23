# Troubleshooting

Common failure modes and their fixes. New entries welcome — open a PR.

## "Database not authorized" / can't connect to Postgres

- Check `DATABASE_URL` matches the container creds (default
  `medusa:medusa_dev_password@localhost:5432/medusa`)
- `docker compose ps` to confirm the postgres container is healthy
- For local dev with multiple checkouts, port `5432` collisions are
  the usual cause. Stop the other container or change the host port

## Storefront images return 404

- The bucket hostname must be in **both** `STOREFRONT_IMAGE_HOSTS`
  (next/image allow-list) **and** the CSP `img-src` (built from
  `STOREFRONT_IMAGE_HOSTS` automatically by `apps/storefront/src/middleware.ts`)
- After changing `STOREFRONT_IMAGE_HOSTS` you must restart the
  storefront — Next.js bakes the image config at boot

## CSP blocks scripts in production

- Production uses a `nonce` + `strict-dynamic` script-src. Inline
  scripts must carry the nonce from the `x-nonce` request header
- Stripe / Plausible / Google Maps origins are pre-allowed in
  `middleware.ts` — anything else needs adding there

## "Insufficient permissions" pulling from GHCR

- The packages are public on the reference repo. Forks need either:
  - Make the GHCR package public (Settings → Packages)
  - Or set a `GHCR_PULL_TOKEN` deploy secret (PAT with
    `read:packages`) and update the `appleboy/ssh-action` env

## `pnpm install` fails with `ERR_PNPM_UNSUPPORTED_ENGINE`

- Node version mismatch. `fnm use` (reads `.node-version`) — must be
  `20.20.2`
- Don't use `nvm install --lts` here; pin via `.node-version`

## Storefront localStorage error on Node ≥ 22.4

- The `globalThis.localStorage` polyfill in
  `apps/storefront/next.config.js` exists for exactly this. Don't
  remove it

## `next.config.js` localStorage polyfill confused me — what is this?

- Node 22.4 added a stricter check that some Sentry / @medusajs paths
  trip during build. The polyfill is a no-op shim that satisfies the
  check. It's the smallest fix that unbroke the build

## Caddy can't get a cert

- Port 80 + 443 must both be open externally — Let's Encrypt
  validation hits port 80 first
- DNS apex must resolve to the VM's public IP
- `docker logs caddy-1` shows the ACME error

## Admin UI is blank / 404 after deploy

- `MEDUSA_BACKEND_URL` must point at the **public** URL
  (`https://api.example.com`), not `http://localhost:9000`
- The admin assets are served from `MEDUSA_ADMIN_PATH` (default `/admin`)

## Migrations stuck on production

```bash
ssh prod-host
cd /opt/retail-example
docker compose -f docker-compose.prod.yml exec -T backend \
  pnpm exec medusa db:migrate
```

If the migration is mid-transaction, find it in
`pg_stat_activity` and decide: cancel and revert, or wait it out.

## "Already exists" on link.create

That's the idempotent path — Medusa raises this when a link already
exists. The seed and `setup-fulfilment` paths swallow it. If your code
doesn't, check `if (e.message?.includes("already exists"))` patterns.

## Storybook fails with `Cannot read properties of undefined (reading 'tap')` or `Cannot find module 'next/dist/build/webpack/plugins/define-env-plugin.js'`

Storybook 8.x has known incompatibilities with Next.js 15.5+. Two failure
modes hit:

- `@storybook/nextjs` (webpack5 builder) — webpack hook `tap` undefined.
- `@storybook/experimental-nextjs-vite` 8.6 — preset imports a Next
  internal that 15.5 moved.

Track upstream fixes in [storybook#32301](https://github.com/storybookjs/storybook/issues/32301).
Until Storybook 9 ships, the Storybook GitHub Pages deploy workflow is
intentionally disabled. Stories still run locally:

```bash
pnpm --filter ./apps/storefront storybook
```

Re-enable by restoring `.github/workflows/storybook.yml` once a working
Storybook + Next.js combination is available, or pin Next.js to 15.4 if
visual regression tests are critical.

## Storybook fails to import `@modules/...`

- Storybook reads tsconfig paths via `@storybook/nextjs`. If a path
  alias still doesn't resolve, add an explicit `webpackFinal` alias in
  `.storybook/main.ts`

## Test accounts log in but get 401 on protected pages

- Customers must be in a `customer_group` other than `pending` for the
  middleware to allow access. Re-run `seed.ts` with
  `SEED_TEST_ACCOUNTS=true` and check the `customer_group_customer`
  table

## Index module errors after bulk product changes

```bash
docker compose exec postgres psql -U medusa -d medusa \
  -c "TRUNCATE index_data, index_relation CASCADE; DELETE FROM index_metadata;"
docker compose restart backend
```

## `pnpm dev` starts then immediately exits

- Almost always a Turbo cache mismatch. Try `just clean && pnpm install`

## Sentry shows up missing release source maps

- The `@sentry/nextjs` plugin needs `SENTRY_AUTH_TOKEN` at build time
  to upload sourcemaps. Without it, Sentry still captures errors but
  shows minified frames
