# Storefront E2E Tests

Playwright specs in this directory exercise the storefront against `http://localhost:8000`.

## Prerequisites

The storefront and backend must be running with seeded data:

- Postgres, Redis, MeiliSearch (Docker)
- Backend on `:9000`
- Storefront on `:8000`
- Seeded: region (AU/AUD), customer groups, breweries, products, approved test member

## Running

### Standard runs

```
pnpm test:e2e            # all specs
pnpm test:e2e:headed     # with browser UI
pnpm test:e2e:debug      # Playwright inspector
```

### CSP nonce verification (`csp-nonce.spec.ts`)

CSP middleware emits `'unsafe-inline' 'unsafe-eval'` in dev and `'nonce-...' 'strict-dynamic'` only in production (see `src/middleware.ts`). The nonce spec REQUIRES a production build:

```
pnpm build && pnpm start
pnpm test:e2e -- csp-nonce.spec.ts
```

Running this spec against `pnpm dev` will fail by design.

### SDK enforcement (`sdk-enforcement.spec.ts`)

Static spec — runs `grep` over `src/`. No services required. Add `// sdk-exempt` on a fetch line to mark a legitimate raw fetch (must be on the same line as `fetch(`).

## Test Groups

| Spec | Type | Requires services |
|------|------|-------------------|
| `sdk-enforcement.spec.ts` | static grep | no |
| `csp-nonce.spec.ts` | dynamic, prod build | yes |
| `visual-polish-uat.spec.ts` | dynamic UI | yes |
| `membership-access.spec.ts` | dynamic, full flow | yes |
| `workflow-enforcement.spec.ts` | static grep | no (deferred to Sprint 5) |
| `minio-unsigned-access.spec.ts` | dynamic | yes (Sprint 8) |
| `search-facet-integrity.spec.ts` | dynamic | yes |
| `hydration-smoke.spec.ts` | dynamic | yes |
| `inventory-reservation.spec.ts` | dynamic | yes |
| `new-flows.spec.ts` | dynamic | yes |
