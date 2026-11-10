# Medusa 2.22 Gotchas (HandG)

HandG runs Medusa 2.22.4. The upstream `building-with-medusa` skill only documents behaviour up to v2.17.3. These are problems hit in this project, each verified at the time noted.

## Store routes silently drop fields (2.21+)

**Symptom:** a field you request from a Store route (e.g. a cart extra) is missing from the response, with no error.

**Cause:** since 2.21, Store routes strip any field that is not on the route's allowed-fields list.

**Fix:** add the field to `apps/backend/src/api/store/cart-allowed-fields.ts`. The guard test is `apps/backend/src/__tests__/unit/store-allowed-fields.unit.spec.ts`; extend it when you add a field.

## `container.resolve()` returns `unknown` / types don't line up

**Cause:** two copies of `@medusajs/types` installed side by side.

**Fix:** keep `dedupePeers: true` in `pnpm-workspace.yaml` and Vite 7 across the workspace. Do not remove either.

## Link-table changes need `--execute-all` once

Deploy workflows run `medusa db:sync-links --execute-safe`, which skips changes Medusa marks "unsafe" (e.g. `product_variant_inventory_item.required_quantity` integer -> numeric in the 2.22 upgrade). After a Medusa upgrade, check for skipped changes and run once on the host:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --no-deps -T backend ./node_modules/.bin/medusa db:sync-links --execute-all
```

Take a DB backup first.

## Index engine stops picking up new products

**Symptom:** new or updated products don't show in storefront listings/filters; `index_metadata` hasn't changed in days. Restarting the backend alone does nothing.

**Fix (in this order):** truncate `index_data`, `index_relation`, `index_sync`; delete from `index_metadata`; then restart the backend. Rebuilds ~170 products in under 20s. Also needed after any direct price write.

Seen repeatedly on 2.17; on 2.22 a new product indexed in ~1s on staging, so check before assuming it still happens.

## `items.*` breaks computed totals in the same query

**Symptom:** `order.total` comes back `0` despite real data.

**Fix:** split into two `query.graph` calls (one for totals, one for `items.*`) and merge in code. Confirmed on 2.17.2 for `order.total` (`cart.subtotal` unaffected); re-verify per field on 2.22.

## Fixed in 2.22 (don't re-add workarounds)

- Admin `POST /admin/products/:id` with only `{thumbnail, images}` no longer fails with "Field 'options' is required". The `set-thumbnails.ts` workaround is no longer needed.

## Not Medusa bugs, but easy to mistake for one

- Anonymous `/store/products` returns no prices by design (`publicProductRedactor`).
- Medusa does not pass `order.version` to fulfillment providers.
