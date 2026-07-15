# Hops & Glory — Project Agent Conventions

Project-local overrides for Cortex Code. Loaded when working from `~/projects/HandG/`.
Global conventions in `~/.snowflake/cortex/AGENTS.md` still apply.

---

## Node / pnpm (HandG-specific)

- Node version pinned via `.node-version` (fnm). Activate: `eval "$(fnm env)" && fnm use`.
- HandG uses Node 24.15.0 LTS, pnpm 10.x.
- `next.config.js` has an unconditional `globalThis.localStorage` polyfill — required on Node ≥22.4. Do not remove.
- Never run `npm install` — always `pnpm install`.

## Medusa v2 — Hard-Won Patterns

- Payment providers register via `@medusajs/medusa/payment` with a `providers` array — NOT as standalone modules.
- Module ID format for payment lookup: `pp_{moduleId}_{providerId}` (e.g. `pp_payid_payid`).
- `link.create` shape: `{ [MODULE_NAME]: { field_id: value } }` — module name (not `module_model`) is the key.
- Custom CLI scripts: `npx medusa exec ./src/scripts/file.ts`.
- `POST /admin/products` does NOT process `sales_channels` in creation — must update separately.
- After bulk product changes, truncate `index_data`, `index_relation`, `index_sync` and DELETE `index_metadata`, then restart backend.
- Subscribers go in `src/subscribers/` with a `SubscriberConfig` export.
- Country-code routing was REMOVED from storefront — never reintroduce `[countryCode]` segments or redirects.
