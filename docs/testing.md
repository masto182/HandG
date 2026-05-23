# Testing

Five layers, each with a clear scope.

## Layer 1: Backend unit tests

```bash
pnpm --filter ./apps/backend test:unit
```

Plain Jest with no Medusa container — fast, run on every PR. Lives
alongside source as `*.unit.spec.ts` (e.g.
`apps/backend/src/__tests__/unit/email-templates.unit.spec.ts`).

## Layer 2: Backend integration tests

```bash
pnpm --filter ./apps/backend test:integration
```

Spins up a real Medusa container against ephemeral Postgres + Redis
(provided by docker compose locally, or by GitHub Actions service
containers in CI). Use these for module services and API routes that
touch the database.

In CI: see `integration-backend` job in `.github/workflows/ci.yml`. The
`postgres:16.4-alpine` and `redis:7.4-alpine` services are health-gated.

## Layer 3: Storefront component tests

```bash
pnpm --filter ./apps/storefront test:component
```

Jest + `@testing-library/react`. Components rendered in isolation with
mocked Medusa SDK calls.

## Layer 4: Storybook (visual + a11y + interaction)

```bash
pnpm --filter ./apps/storefront storybook       # interactive
pnpm --filter ./apps/storefront test:storybook  # headless test runner
```

The test runner uses `@storybook/test-runner` to:

- Render every story in a real browser
- Run `@storybook/addon-a11y` axe-core checks
- Replay any `play()` interactions

Stories live next to their components as `*.stories.tsx`. See
[`.storybook/`](../apps/storefront/.storybook/) and the
[Storybook intro story](../apps/storefront/src/stories/Introduction.stories.tsx).

## Layer 5: Storefront E2E (Playwright)

```bash
pnpm --filter ./apps/storefront test:e2e         # against dev server
pnpm --filter ./apps/storefront test:e2e:prod    # build + start, then run
pnpm --filter ./apps/storefront test:e2e:headed  # see the browser
```

E2E runs against a real backend. The CSP nonce + `strict-dynamic`
script-src is only emitted in production mode, so use `test:e2e:prod`
when validating CSP-sensitive flows. Test accounts:

```
approved@example.test  / TestApproved123!
vip@example.test       / TestVip123!
pending@example.test   / TestPending123!
```

Seed them with `SEED_TEST_ACCOUNTS=true pnpm --filter ./apps/backend exec medusa exec ./src/scripts/seed.ts`.

## Quality gates in CI

| Job (`.github/workflows/ci.yml`)  | Layer            | Blocks merge? |
| --------------------------------- | ---------------- | ------------- |
| `Lint`                            | static           | yes           |
| `Typecheck`                       | static           | yes           |
| `Build (turbo)`                   | static           | yes           |
| `Backend unit tests`              | layer 1          | yes           |
| `Storefront component tests`      | layer 3          | yes           |
| `Backend integration tests`       | layer 2          | yes           |
| `gitleaks`, `CodeQL`, `pnpm audit`, `Trivy fs` | security | yes  |
| `Lighthouse CI`                   | perf / a11y / SEO | yes (storefront PRs) |

E2E and Storybook test-runner are **not** in the merge gate by default
— they're slower and flakier. Run them in a nightly workflow or before
release PRs.
