# AusPost Module (PAC)

Custom Medusa Fulfillment Module Provider that wraps the [Australia Post Postage Assessment Calculator (PAC) API](https://developers.auspost.com.au/apis/pac/getting-started). Provides AU-domestic Parcel Post / Express Post rates at checkout. Manual fulfillment via the MyPost Business web portal.

## Status

WI-34. See `Site-Build/.snowflake/cortex/plans/auspost-pac-integration.plan.md` (v5).

## Why PAC and not Shipping & Tracking?

AusPost has three developer APIs:

| API | What it does | Who can use it |
|---|---|---|
| **PAC** | Rates only. Retail (RRP) prices. | Anyone with a free API key. |
| **Shipping & Tracking** | Rates + labels + manifest. Contracted prices. | Contract customers only (eParcel / StarTrack). |
| **Delivery Choices** | Customer-facing timeslot picker. | Invitation-only, eParcel-only. |

MyPost Business is a **self-serve retail account, not a contract**. There is no public AusPost API that exposes MPB-contracted rates or labels. PAC is the only path.

Implication: the customer sees PAC retail prices. You actually pay (less) MPB-contracted prices when you lodge in the portal. The gap is your margin. Use `auspost_discount_pct_*` SiteConfig keys to give the customer a slice of that margin if you want a more competitive shipping price.

## Endpoints used

| Need | Endpoint | Method |
|---|---|---|
| Available services for a parcel + lane | `/postage/parcel/domestic/service.json` | GET |
| Calculate price for a service (with options) | `/postage/parcel/domestic/calculate.json` | GET |

Auth: `AUTH-KEY` header (single line). No account number.

Test endpoint `test.npe.auspost.com.au` was retired by AusPost. The published shared test key works against the prod URL — treat it as a "shared dev key" rather than a sandbox.

## Service codes surfaced at checkout

- `AUS_PARCEL_REGULAR` -> "Australia Post - Standard"
- `AUS_PARCEL_EXPRESS` -> "Australia Post - Express"

PAC also returns satchel and pre-paid box codes; we ignore those because beer ships in custom cartons (see `shipping-common/packing.ts`).

## Extra Cover and Signature on Delivery

PAC's `max_extra_cover` is 500 base, 5,000 with SOD added. The provider auto-adds:

- **Extra Cover** when cart subtotal >= `auspost_extra_cover_threshold_aud` (default $200).
- **Signature on Delivery** when cart subtotal exceeds `auspost_sod_trigger_aud` (default $300), to lift the cover cap to $5,000.

Surcharges (SOD, Extra Cover) always pass through at PAC cost. Discount % only applies to the base service rate.

## Manual fulfillment workflow

1. Customer picks an AusPost rate at checkout. Order paid.
2. Admin clicks Fulfill on the order. Provider's `createFulfillment` writes a `manual_lodgement` flag plus a per-box breakdown to fulfillment data. No label is bought.
3. Admin opens the AusPost lodgement card on the order detail page (sibling widget). Shows:
   - Per-parcel breakdown: weight, dimensions
   - Link to MyPost Business portal
   - Tracking-number input per parcel
4. Admin lodges each parcel in the MPB portal, copies tracking numbers, pastes them into the card, clicks Save.
5. The save endpoint (`POST /admin/orders/:id/auspost/tracking`) records the tracking numbers and emits `order.shipment_created` so the existing `order-shipped-email` subscriber notifies the customer.

## SiteConfig keys (shipping group)

| Key | Type | Default | Purpose |
|---|---|---|---|
| `auspost_enabled` | boolean | false | Master switch. When false, AusPost rates are silently omitted from `/store/shipping/rates`. |
| `auspost_mode` | string | "production" | "production" hits digitalapi.auspost.com.au. (Test endpoint retired.) |
| `auspost_api_key` | string (secret) | "" | PAC AUTH-KEY. Empty -> stub mode. Env: `AUSPOST_API_KEY`. |
| `auspost_services_enabled` | jsonb | `["AUS_PARCEL_REGULAR","AUS_PARCEL_EXPRESS"]` | Service codes to surface. |
| `auspost_discount_pct_standard` | number | 0 | % off Parcel Post base rate shown to customer. |
| `auspost_discount_pct_express` | number | 0 | % off Express Post base rate shown to customer. |
| `auspost_extra_cover_threshold_aud` | number | 200 | Auto-add Extra Cover at/above this subtotal. |
| `auspost_sod_trigger_aud` | number | 300 | Auto-add SOD when subtotal exceeds this (lifts cover cap). |

## Environment variables

- `AUSPOST_API_KEY` - empty -> stub mode (deterministic AUD rates per weight band).
- `AUSPOST_API_BASE` - optional override of the PAC base URL.

## Discovery / setup

```bash
AUSPOST_API_KEY=$KEY pnpm exec medusa exec ./src/scripts/auspost-list-services.ts
```

Prints the services PAC returns for a Sydney -> Melbourne 1.5kg sample. Use it to verify your live key works and to see all available service codes.

## Pre-launch validation tasks

Before flipping `auspost_enabled = true`:

1. **Remeasure real cartons.** Box dims in `shipping-common/packing.ts` are approximate. PAC quotes exactly what we send. Re-measure your Small / Medium / Large cartons and update the constants if they drift > 1cm.
2. **Weigh sample bottles and crowlers.** `CONTAINER_WEIGHTS` defaults: can 500g, bottle 600g, crowler 1200g. Weigh 5 of each and update if averages drift > 100g.
3. **Compare PAC RRP vs MyPost Business invoices** for your last 10 lodgements. Decide an `auspost_discount_pct_*` value (often 5-15% off RRP for Standard, 0-5% for Express). Default is 0 (pass-through RRP).

## Architecture

```
apps/backend/src/modules/shipping-common/packing.ts
  -> packItems() returns PackedBox[] (small/medium/large, can/bottle/crowler rules)

apps/backend/src/modules/auspost/
  client.ts        AusPostPacClient (live HTTP, AUTH-KEY only)
  stub.ts          StubAusPostPacClient (deterministic by weight band)
  factory.ts       getAusPostClient() picks live vs stub from env
  types.ts         PAC request/response shapes
  mapping.ts       quoteService(), boxesToPacRequests(), allocateCover(), applyDiscount(), parseSurcharges()
  service.ts       AusPostProviderService (extends AbstractFulfillmentProviderService)
  index.ts         ModuleProvider for Modules.FULFILLMENT, identifier "auspost"

apps/backend/src/api/store/shipping/rates/route.ts
  -> Builds PackedBox[] once, fans out to ShipEngine + AusPost in parallel,
     merges by amount_cents.

apps/backend/src/api/admin/shipping/auspost/test-connection/route.ts
  -> Admin smoke-test for PAC connectivity.

apps/backend/src/api/admin/orders/[id]/auspost/tracking/route.ts
  -> Saves tracking numbers pasted in the manual-lodgement card.

apps/backend/src/admin/routes/shipping/auspost/page.tsx
  -> Admin config page with Test Connection.

apps/backend/src/admin/widgets/order-auspost-lodgement.tsx
  -> Order-detail widget showing per-box breakdown and tracking input.

apps/backend/src/scripts/auspost-list-services.ts
  -> One-time discovery printer.

apps/backend/src/jobs/sample-shipping-rates.ts
  -> Weekly cron now also records AusPost RRP per sample lane.
```

## References

- PAC overview: https://developers.auspost.com.au/apis/pac/getting-started
- Domestic parcel tutorial: https://developers.auspost.com.au/apis/pac/tutorial/domestic-parcel
- API reference: https://developers.auspost.com.au/apis/pac/reference
- Free API key registration: https://developers.auspost.com.au/apis/pacpcs-registration
- MyPost Business portal: https://business.auspost.com.au

## Out of scope (Phase 2 backlog)

- AusPost / StarTrack contract + Shipping & Tracking API swap (gives contracted rates programmatically).
- Cross-provider auto-pick-cheapest at fulfillment.
- Per-product custom dimensions (currently typed by container, not per-SKU).
- Customer-facing Extra Cover opt-in checkbox.
- Pickup booking.
- International services.
- Starshipit / Shippit aggregator path.

---

## v2 - Carrier-grouped checkout (WI-35)

After WI-35, `/store/shipping/rates` returns enriched, grouped rates and supports a `require_signature` flag.

### Response shape

```jsonc
{
  "rates": [
    {
      "id": "auspost-aus_parcel_regular-1700000000000",
      "name": "Parcel Post",
      "amount": 1240,
      "currency_code": "aud",
      "price_type": "calculated",
      "provider_id": "auspost",
      "carrier_group": "australia_post",
      "carrier_display_name": "Australia Post",
      "service_tier": "standard",
      "delivery_behaviour": "attempted",
      "is_default_behaviour": true,
      "data": { ... }
    }
  ],
  "groups": [
    { "carrier_group": "australia_post", "carrier_display_name": "Australia Post", "rates": [...] },
    { "carrier_group": "aramex", "carrier_display_name": "Aramex", "rates": [...] },
    { "carrier_group": "couriers_please", "carrier_display_name": "CouriersPlease", "rates": [...] }
  ],
  "best_price_rate_id": "shipengine-aramex-leave-at-door-...",
  "carrier_unavailable": [],     // populated when require_signature filters out a carrier
  "require_signature": false
}
```

### Query params

- `cart_id=<id>` (required)
- `require_signature=true` - forces SOD on AusPost regardless of subtotal; filters ShipEngine rates to signature variants only.
- `debug=1` - includes a `debug` field with provider error messages and ShipEngine `invalid_rates` (admin/dev only).

### Carrier service code reference (live as of 2026-05-18)

| Provider | Carrier | Service code | Tier | Behaviour |
|---|---|---|---|---|
| auspost | Australia Post | `AUS_PARCEL_REGULAR` | standard | attempted |
| auspost | Australia Post | `AUS_PARCEL_REGULAR` + SOD | standard | signature |
| auspost | Australia Post | `AUS_PARCEL_EXPRESS` | express | attempted |
| auspost | Australia Post | `AUS_PARCEL_EXPRESS` + SOD | express | signature |
| shipengine | CouriersPlease | `couriersplease_walleted_parcel` | standard | attempted |
| shipengine | Aramex | `aramex_au_walleted_standard` | standard | attempted |
| shipengine | Aramex | `aramex_au_walleted_leave_at_door` | standard | leave_at_door |
| shipengine | Aramex | `aramex_au_walleted_signature_required` | standard | signature |
| shipengine | Aramex (Fastway) | `fastway_au_walleted_priority` | express | attempted |

Aramex does NOT sell a signature variant on Fastway Priority - only on standard road. CouriersPlease has only one service code (no leave-at-door or signature variants on this account).

### Stitch design brief (v3)

#### Layout

Vertical stack centred on a 720px column on desktop; full-width with 16px horizontal padding on mobile. Three carrier groups stack top-to-bottom in the SiteConfig-defined order (Australia Post, Aramex, CouriersPlease). Each group has a small uppercase header followed by 1-3 rate cards with 12px vertical spacing between cards. 32px gap between carrier groups. A single insurance summary line under all groups.

#### Components

- `CarrierGroupHeader { carrierName }`: uppercase, tracking-wide, muted secondary colour, 12px font, 12px bottom margin.
- `RateCard { name, priceCents, currency, deliveryDays, isSelected, isBest, behaviourChip? }`: radio + service name on the left, price on the right. Below name: estimated-delivery line, optional behaviour chip, optional Best price chip. 1.5px border that brightens to gold on selection; 5% gold tint background when selected.
- `SignatureToggle { checked, deltaCents, currency, onChange }`: small inline checkbox under its parent RateCard, indented to align with card content. Label: "Require signature on delivery (+$X.XX)" - the "+$X.XX" rendered in gold accent. Only renders when the rate has a `signature_sibling`.
- `BestPriceChip`: solid gold pill, dark text, uppercase, tracking-wide, 10px font. Single chip across the whole list; reattaches to the row with the lowest effective price (recomputes when toggles flip).
- `BehaviourChip`: outline-only border, secondary text colour, 10px font. Renders only when the row's `delivery_behaviour` is non-default for the carrier (default = attempted).
- `InsuranceSummary { provider, coverAud? }`: single centred line, 12px muted text. Three states: "Parcel cover: $X included with this option." | "No additional parcel cover on this option." | "Carrier insurance varies; details will appear on your tracking confirmation."

#### Visual style

Snowflake-corporate dark mode. Background `#0F172A`, surface `#1E293B`, gold accent `#D4AF37`, secondary text `#94A3B8`. Rounded-xl cards (12px radius), 1.5px borders. 24px gaps between groups, 12px between rows in a group, 8px between RateCard and its SignatureToggle. No neon, no drop shadows, no hover glows.

#### Interactions

Single radio across the entire list - one rate selected at a time across all groups. SignatureToggle on a row instantly updates that row's displayed price (to `signature_sibling.amount`) WITHOUT a network call. If that row is currently selected, the form submits the sibling's `rate_id`; the visible row remains the toggle anchor. Ticking on a non-selected row does NOT auto-select it. The Best price chip recomputes whenever any toggle flips and always sits on whichever row has the lowest effective price right now.

#### Sample data

Response shape (matches `CarrierRatesResponse` after WI-36):

```jsonc
{
  "groups": [
    {
      "carrier_group": "australia_post",
      "carrier_display_name": "Australia Post",
      "rates": [
        {
          "id": "auspost-aus_parcel_regular-std-...",
          "name": "Parcel Post",
          "amount": 1240,
          "currency_code": "aud",
          "service_tier": "standard",
          "delivery_behaviour": "attempted",
          "is_default_behaviour": true,
          "signature_sibling": { "rate_id": "...sig-...", "amount": 1635, "delta_cents": 395 },
          "data": { "delivery_days": 4, "cover_total_aud": 250 }
        }
      ]
    },
    {
      "carrier_group": "aramex",
      "carrier_display_name": "Aramex",
      "rates": [
        { "id": "aramex-std-...", "name": "Road Express", "amount": 1350,
          "delivery_behaviour": "attempted", "is_default_behaviour": true,
          "signature_sibling": { "rate_id": "aramex-sig-...", "amount": 1580, "delta_cents": 230 } },
        { "id": "aramex-atl-...", "name": "Road Express - Leave at door", "amount": 1120,
          "delivery_behaviour": "leave_at_door", "is_default_behaviour": false }
      ]
    },
    {
      "carrier_group": "couriers_please",
      "carrier_display_name": "CouriersPlease",
      "rates": [
        { "id": "cp-...", "name": "Standard parcel", "amount": 1185,
          "delivery_behaviour": "attempted", "is_default_behaviour": true }
      ]
    }
  ],
  "best_price_rate_id": "aramex-atl-..."
}
```

#### One-paragraph TL;DR (paste this into Stitch)

> AU shipping checkout, dark mode Snowflake-corporate aesthetic. Vertical stack of three carrier groups in fixed order (Australia Post, Aramex, CouriersPlease), each with a small uppercase muted header and 1-3 rate cards. Each rate card has a radio, service name, price on the right, estimated delivery line, optional behaviour chip ("Leave at door" or "Signature required") shown only when the row's behaviour differs from the carrier's default attempted-delivery, and a Best price chip on whichever row has the lowest effective price. Below applicable rate cards (those with a `signature_sibling`), render a small inline "Require signature on delivery (+$X.XX)" checkbox; ticking it instantly updates that card's price label to the sibling amount without a network call and recomputes the Best price chip globally. Aramex's "Leave at door" variant stays as its own card without a toggle (it's a different product, not a stricter version of attempted delivery). Below all groups, a single small centered line summarising parcel cover for the currently selected option ("Parcel cover: $X included" / "No additional parcel cover" / generic carrier insurance note for non-AusPost). Cards have 12px radius, 1.5px borders that brighten to gold on selection with a 5% gold tint background fill, generous padding, no shadows or glows.

### SiteConfig keys (v2)

| Key | Type | Default | Purpose |
|---|---|---|---|
| `shipping_dedup_within_carrier` | boolean | true | Show only the cheapest rate per (carrier, tier, behaviour). |
| `shipping_carrier_order` | jsonb | `["australia_post","aramex","couriers_please"]` | Display order. |
| `shipping_signature_recommended_threshold_aud` | number (public) | 300 | Storefront auto-ticks Require signature above this subtotal. |
