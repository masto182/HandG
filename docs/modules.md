# Modules

The retail example ships with 21 custom Medusa modules in
`apps/backend/src/modules/`. They are independent — keep what you
need, delete the rest. The seed script and `medusa-config.ts` reference
some of them; remove the references when you delete a module.

## Module catalogue

| Module                    | Purpose                                                              | Storefront-visible? |
| ------------------------- | -------------------------------------------------------------------- | ------------------- |
| `announcement`            | Sitewide banner / promo announcement                                 | yes                 |
| `auspost`                 | Australia Post fulfilment provider (live PAC rates)                  | no (provider)       |
| `beer-detail`             | Product enrichment (ABV, IBU, batch, brewery link)                   | yes                 |
| `beer-style`              | Reference taxonomy for beer styles                                   | yes                 |
| `brewery`                 | Brewery profiles + metadata                                          | yes                 |
| `campaign`                | Marketing campaign catalogue                                         | yes                 |
| `email-change-request`    | Two-step email change with verification token                        | yes                 |
| `hop`                     | Hop variety reference                                                | yes                 |
| `notification`            | In-app notification inbox (read / unread)                            | yes                 |
| `notification-preference` | Per-customer email category opt-in / out                             | yes                 |
| `payment-payid`           | PayID manual payment provider (Australian bank-rail)                 | no (provider)       |
| `pickup-location`         | Pickup destinations with hours / phone / sort order                  | yes                 |
| `referral`                | Customer referral relationships                                      | yes                 |
| `restock-alert`           | Customer subscriptions for "notify me when back in stock"            | yes                 |
| `shipengine`              | ShipEngine fulfilment provider (multi-carrier)                       | no (provider)       |
| `shipping-common`         | Shared packing / normalisation utilities                             | no (lib)            |
| `shipping-rate-history`   | Weekly rate sample storage for benchmarking                          | no                  |
| `site-config`             | Hybrid file + DB site-config registry with admin overrides           | yes                 |
| `vip-score`               | VIP-tier scoring & tracking                                          | yes                 |
| `wishlist`                | Customer wishlists                                                   | yes                 |

## Anatomy of a module

```
apps/backend/src/modules/<name>/
├── index.ts          Module() registration with id + service
├── service.ts        Business logic (extends MedusaService)
├── models/           MikroORM entities
├── migrations/       Generated SQL migrations
├── workflows/        Optional: step + workflow definitions
└── repositories/     Optional: query helpers
```

## Removing a module

1. Delete the directory (`rm -rf apps/backend/src/modules/<name>`)
2. Remove its registration from `apps/backend/medusa-config.ts`
3. Remove any cross-module links it created (search for `link.create`
   referencing the module ID)
4. Drop its tables: write a migration that issues `DROP TABLE` for the
   module's tables, or run `medusa db:reset` in non-prod
5. Remove any storefront UI that consumed it (`apps/storefront/src/modules/`)
6. Remove env vars for the module from `.env.example` files

## Adding a module

```bash
just migration my-feature
```

Generates a migration scaffold against the latest schema. Then write
the model, service, and registration in a new directory.

See the [Medusa module docs](https://docs.medusajs.com/learn/fundamentals/modules)
for the full lifecycle.

## Module ID conventions

Module IDs are camelCase strings registered via
`Module(MY_MODULE_ID, { service })`. The same ID is used by:

- `container.resolve(MY_MODULE_ID)` in API routes / scripts
- `link.create({ [MY_MODULE_ID]: { ... } })` for module links
- `payment` provider lookup: `pp_{moduleId}_{providerId}`
  (e.g. `pp_payid_payid`)

The five modules originally named with snake_case
(`notification_preference`, `site_config`, `pickup_location`,
`email_change_request`, `shipping_rate_history`) were renamed to
camelCase during the migration to match this convention.
