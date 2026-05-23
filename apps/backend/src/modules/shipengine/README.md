# ShipEngine Module

Custom Medusa Fulfillment Module Provider that wraps the [ShipEngine API](https://www.shipengine.com/docs/) (= ShipStation API; mid-rebrand). Provides live carrier-calculated rates at checkout, label purchase via `rate_id`, label voiding, and a stub mode for dev/CI.

## Status

Sprint 8 deliverable. See `Site-Build/.snowflake/cortex/plans/sprint-8-shipping-shipengine.plan.md`.

## Cost model — read this before configuring carriers

ShipEngine is a **routing/labelling layer**, NOT a rate-discounter for every carrier. Two pricing models:

### 1. Bring Your Own Account (BYOA)
You connect your own carrier credentials. Rates returned by `/v1/rates` are **your contracted rates**. ShipEngine adds a small per-label fee but does not discount the carrier rate.

Applies to:
- **Australia Post MyPost Business** — rates identical to MyPost direct.
- **Australia Post / StarTrack eParcel** — your contracted rates.
- **Aramex Australia direct** — your franchise account rates.

### 2. "From ShipStation" reseller carriers
ShipStation has volume contracts and resells discounted rates. Available in AU:
- **CouriersPlease from ShipStation** — typically 5-15% cheaper than CouriersPlease direct on metro lanes
- **Aramex Australia from ShipStation** — 5-10% cheaper on regional lanes
- **DHL Express Australia from ShipStation**

NOT available: **Australia Post from ShipStation** (AusPost does not permit aggregator-style rate reselling, unlike USPS via Stamps.com in the US).

### Recommended AU mix

1. MyPost Business (BYOA) — your contracted rates, fallback for unsupported lanes.
2. CouriersPlease-from-ShipStation — cheaper for metro.
3. Aramex-from-ShipStation — cheaper for regional.

The pass-through provider returns ALL configured carriers' rates per shipment, and (when `auto_pick_cheapest_label = true`) selects the cheapest at fulfillment time.

### Sendle no longer operates in Australia

Sendle exited the AU market in 2024. Do not enable it. Sendle still operates in US/Canada.

## Endpoints used (Free tier)

| Need | Endpoint | Method |
|---|---|---|
| Rates | `/v1/rates` | POST |
| Buy label from rate | `/v1/labels/rates/{rate_id}` | POST |
| Buy label direct | `/v1/labels` | POST |
| Void label | `/v1/labels/{label_id}/void` | PUT |
| Track by label id | `/v1/labels/{label_id}/track` | GET |
| List carriers | `/v1/carriers` | GET |

NOT used (Advanced plan only): `POST /v1/addresses/validate` standalone, `GET /v1/tracking` by carrier+number.

## Environment

- `SHIPENGINE_API_KEY` — empty -> stub mode. Otherwise live.
- `SHIPENGINE_API_BASE` — default `https://api.shipengine.com/v1`.

## Discovery

```bash
SHIPENGINE_API_KEY=$KEY pnpm exec medusa exec ./src/scripts/shipengine-list-carriers.ts
```

Prints `carrier_id | carrier_code | friendly_name | services` for every connected carrier. Copy the `se-XXXXX` ids into SiteConfig `shipengine_carrier_ids`.

## SiteConfig keys (shipping group)

| Key | Type | Default | Public | Purpose |
|---|---|---|---|---|
| `heat_hold_enabled` | boolean | false | yes | Block fulfillment site-wide |
| `shipping_heat_hold_message` | string | (default copy) | yes | Storefront banner text |
| `free_shipping_threshold_aud` | number | 0 | yes | Cart subtotal for free shipping |
| `shipping_from_name` | string | "Hops & Glory" | no | Sender name |
| `shipping_from_phone` | string | (placeholder) | no | Sender phone |
| `shipping_from_address_1` | string | "1 Hillside Lane" | no | Sender street |
| `shipping_from_city` | string | "Sydney" | no | Sender city |
| `shipping_from_state` | string | "NSW" | no | Sender state |
| `shipping_from_postcode` | string | "2000" | no | Sender postcode |
| `shipping_from_country` | string | "AU" | no | ISO-3166 alpha-2 |
| `shipengine_carrier_ids` | jsonb | [] | no | Active `se-XXXXX` carrier_ids |
| `shipping_default_item_weight_g` | number | 750 | no | Fallback per-line weight |
| `shipping_validate_address_mode` | string | "validate_and_clean" | no | Inline ShipEngine validation mode |
| `auto_pick_cheapest_label` | boolean | true | no | Re-quote at fulfillment for cheapest rate |
| `rate_comparison_sample_addresses` | jsonb | 4 sample shipments | no | Inputs for weekly rate-comparison cron |

## References

- Medusa tutorial: https://docs.medusajs.com/resources/integrations/guides/shipstation
- ShipEngine API docs: https://www.shipengine.com/docs/
- AU carrier codes: https://www.shipengine.com/docs/tracking/#supported-carriers
- ShipEngine portal: https://dashboard.shipengine.com
