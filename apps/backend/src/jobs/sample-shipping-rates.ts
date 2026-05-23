import type { MedusaContainer } from "@medusajs/framework/types"
import { getShipEngineClient } from "../modules/shipengine/factory"
import { cartToShipEngineShipment } from "../modules/shipengine/mapping"
import { getAusPostClient } from "../modules/auspost/factory"
import { quoteService as auspostQuoteService } from "../modules/auspost/mapping"
import type { PacServiceCode } from "../modules/auspost/types"
import { SITE_CONFIG_MODULE } from "../modules/site-config"
import type SiteConfigModuleService from "../modules/site-config/service"
import { SHIPPING_RATE_HISTORY_MODULE } from "../modules/shipping-rate-history"
import type ShippingRateHistoryModuleService from "../modules/shipping-rate-history/service"

type SampleAddress = {
  label: string
  postcode: string
  state: string
  weight_g: number
  city?: string
  country_code?: string
}

const DEFAULT_SAMPLES: SampleAddress[] = [
  { label: "Melbourne metro", postcode: "3000", state: "VIC", weight_g: 1500, city: "Melbourne" },
  { label: "Sydney metro", postcode: "2000", state: "NSW", weight_g: 1500, city: "Sydney" },
  { label: "Regional VIC (Bendigo)", postcode: "3550", state: "VIC", weight_g: 1500, city: "Bendigo" },
  { label: "Regional NSW (Wagga)", postcode: "2650", state: "NSW", weight_g: 1500, city: "Wagga Wagga" },
]

const BASELINE_CARRIER_CODE = "australia_post"

/**
 * Weekly job: quotes 4 representative AU shipments via ShipEngine and persists
 * a rate-history row per sample. Used by the admin shipping page snapshot card
 * to validate the carrier mix and spot pricing trends.
 *
 * Stub-mode safe: when SHIPENGINE_API_KEY is empty the job logs and exits
 * without writing rows (since the stub returns deterministic test data).
 */
export default async function sampleShippingRates(container: MedusaContainer) {
  const logger = container.resolve("logger") as { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void }

  if (!process.env.SHIPENGINE_API_KEY) {
    logger.info("[shipengine] sample-shipping-rates: SHIPENGINE_API_KEY empty; skipped (stub mode)")
    return
  }

  let samples: SampleAddress[] = DEFAULT_SAMPLES
  let carrierIds: string[] = []
  let fromAddressDefaults = {
    shipping_from_name: "Hops & Glory",
    shipping_from_phone: "+61 0 0000 0000",
    shipping_from_address_1: "1 Hillside Lane",
    shipping_from_city: "Sydney",
    shipping_from_state: "NSW",
    shipping_from_postcode: "2000",
    shipping_from_country: "AU",
  }
  let validateMode: "no_validation" | "validate_only" | "validate_and_clean" = "validate_and_clean"
  let defaultWeightG = 750

  try {
    const sc = container.resolve(SITE_CONFIG_MODULE) as SiteConfigModuleService
    const customSamples = await sc.get<SampleAddress[]>("rate_comparison_sample_addresses")
    if (Array.isArray(customSamples) && customSamples.length) samples = customSamples
    carrierIds = (await sc.get<string[]>("shipengine_carrier_ids")) ?? []
    fromAddressDefaults = {
      shipping_from_name: await sc.get<string>("shipping_from_name"),
      shipping_from_phone: await sc.get<string>("shipping_from_phone"),
      shipping_from_address_1: await sc.get<string>("shipping_from_address_1"),
      shipping_from_city: await sc.get<string>("shipping_from_city"),
      shipping_from_state: await sc.get<string>("shipping_from_state"),
      shipping_from_postcode: await sc.get<string>("shipping_from_postcode"),
      shipping_from_country: await sc.get<string>("shipping_from_country"),
    }
    validateMode = (await sc.get<typeof validateMode>("shipping_validate_address_mode")) ?? "validate_and_clean"
    defaultWeightG = (await sc.get<number>("shipping_default_item_weight_g")) ?? 750
  } catch (err) {
    logger.warn(`[shipengine] sample-shipping-rates: SiteConfig unavailable; using defaults: ${(err as Error).message}`)
  }

  if (!carrierIds.length) {
    logger.info("[shipengine] sample-shipping-rates: no carrier_ids configured; skipping")
    return
  }

  const client = getShipEngineClient()
  const history = container.resolve(SHIPPING_RATE_HISTORY_MODULE) as ShippingRateHistoryModuleService
  const sampledAt = new Date()

  for (const sample of samples) {
    const body = cartToShipEngineShipment({
      shippingAddress: {
        first_name: "Sample",
        last_name: sample.label,
        address_1: "Sample St",
        city: sample.city ?? "Sydney",
        province: sample.state,
        postal_code: sample.postcode,
        country_code: sample.country_code ?? "AU",
      },
      packages: [{ weightG: sample.weight_g ?? defaultWeightG, lengthCm: 24, widthCm: 19, heightCm: 12 }],
      fromAddress: fromAddressDefaults,
      carrierIds,
      validateMode,
    })
    try {
      const response = await client.getRates(body)
      const rates = response?.rate_response?.rates ?? []
      const carrierResults = rates.map((r) => ({
        carrier_code: r.carrier_code,
        carrier_friendly_name: r.carrier_friendly_name,
        service_code: r.service_code,
        service_type: r.service_type,
        amount_cents: Math.round((r.shipping_amount?.amount ?? 0) * 100),
        currency: r.shipping_amount?.currency,
        delivery_days: r.delivery_days ?? null,
      }))
      const cheapest = [...carrierResults].sort((a, b) => a.amount_cents - b.amount_cents)[0]
      const baseline = carrierResults.find((c) => c.carrier_code === BASELINE_CARRIER_CODE)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (history as any).createShippingRateHistories({
        sampled_at: sampledAt,
        sample_label: sample.label,
        weight_g: sample.weight_g,
        destination_postcode: sample.postcode,
        destination_state: sample.state,
        destination_country: sample.country_code ?? "AU",
        carrier_results: carrierResults,
        cheapest_carrier_code: cheapest?.carrier_code ?? null,
        cheapest_amount_cents: cheapest?.amount_cents ?? null,
        baseline_carrier_code: baseline?.carrier_code ?? null,
        baseline_amount_cents: baseline?.amount_cents ?? null,
      })
      logger.info(
        `[shipengine] sample '${sample.label}' cheapest=${cheapest?.carrier_code ?? "?"}@${
          cheapest ? `$${(cheapest.amount_cents / 100).toFixed(2)}` : "?"
        }${
          baseline && cheapest && cheapest.carrier_code !== BASELINE_CARRIER_CODE
            ? ` (baseline ${baseline.carrier_code} $${(baseline.amount_cents / 100).toFixed(2)}; saving $${((baseline.amount_cents - cheapest.amount_cents) / 100).toFixed(2)})`
            : ""
        }`,
      )
    } catch (err) {
      logger.warn(`[shipengine] sample '${sample.label}' failed: ${(err as Error).message}`)
    }

    // ---------- AusPost PAC quote alongside ShipEngine ----------
    try {
      const ap = await quoteAusPost({
        container,
        sample,
        fromPostcode: fromAddressDefaults.shipping_from_postcode,
        sampledAt,
      })
      if (ap) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (history as any).createShippingRateHistories(ap)
      }
    } catch (err) {
      logger.warn(`[auspost] sample '${sample.label}' failed: ${(err as Error).message}`)
    }
  }
}

async function quoteAusPost(args: {
  container: MedusaContainer
  sample: SampleAddress
  fromPostcode: string
  sampledAt: Date
}): Promise<Record<string, unknown> | null> {
  let enabled = false
  let services: PacServiceCode[] = ["AUS_PARCEL_REGULAR", "AUS_PARCEL_EXPRESS"]
  let coverThresholdAud = 200
  let sodTriggerAud = 300
  let discountStandard = 0
  let discountExpress = 0
  try {
    const sc = args.container.resolve(SITE_CONFIG_MODULE) as SiteConfigModuleService
    enabled = (await sc.get<boolean>("auspost_enabled")) ?? false
    const rawServices = (await sc.get<string[]>("auspost_services_enabled")) ?? services
    services = rawServices.filter(
      (c): c is PacServiceCode => c === "AUS_PARCEL_REGULAR" || c === "AUS_PARCEL_EXPRESS",
    )
    coverThresholdAud = (await sc.get<number>("auspost_extra_cover_threshold_aud")) ?? coverThresholdAud
    sodTriggerAud = (await sc.get<number>("auspost_sod_trigger_aud")) ?? sodTriggerAud
    discountStandard = (await sc.get<number>("auspost_discount_pct_standard")) ?? 0
    discountExpress = (await sc.get<number>("auspost_discount_pct_express")) ?? 0
  } catch {
    /* fall back to defaults */
  }
  if (!enabled) return null

  const client = getAusPostClient()
  // Single-box sample using the existing weight; PAC requires non-zero dims.
  const packedBoxes = [
    { weightG: args.sample.weight_g, lengthCm: 24, widthCm: 19, heightCm: 12 },
  ]
  // Estimate cart subtotal as $200 so cover threshold logic is exercised.
  const cartSubtotalAud = 200

  const carrierResults: Array<Record<string, unknown>> = []
  for (const serviceCode of services) {
    const quote = await auspostQuoteService({
      client,
      packedBoxes,
      fromPostcode: args.fromPostcode,
      toPostcode: args.sample.postcode,
      serviceCode,
      cartSubtotalAud,
      opts: {
        coverThresholdAud,
        sodTriggerAud,
        discountPctStandard: discountStandard,
        discountPctExpress: discountExpress,
      },
    })
    carrierResults.push({
      carrier_code: "australia_post",
      carrier_friendly_name: "Australia Post (PAC)",
      service_code: serviceCode,
      service_type: serviceCode === "AUS_PARCEL_EXPRESS" ? "Express Post" : "Parcel Post",
      amount_cents: quote.customer_total_cents,
      rrp_cents: quote.rrp_total_cents,
      currency: "aud",
      delivery_days: serviceCode === "AUS_PARCEL_EXPRESS" ? 2 : 4,
      sod_added: quote.sod_added,
      cover_total_aud: quote.cover_total_aud,
    })
  }

  if (!carrierResults.length) return null
  const cheapest = [...carrierResults].sort(
    (a, b) => (a.amount_cents as number) - (b.amount_cents as number),
  )[0]

  return {
    sampled_at: args.sampledAt,
    sample_label: `${args.sample.label} (auspost)`,
    weight_g: args.sample.weight_g,
    destination_postcode: args.sample.postcode,
    destination_state: args.sample.state,
    destination_country: args.sample.country_code ?? "AU",
    carrier_results: carrierResults,
    cheapest_carrier_code: cheapest?.carrier_code ?? null,
    cheapest_amount_cents: (cheapest?.amount_cents as number) ?? null,
    baseline_carrier_code: "australia_post",
    baseline_amount_cents: (cheapest?.amount_cents as number) ?? null,
  }
}

export const config = {
  name: "sample-shipping-rates",
  // Mondays 03:00 (server tz). 7 days * 24 hours.
  schedule: "0 3 * * 1",
}
