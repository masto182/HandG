import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getShipEngineClient } from "../../../../modules/shipengine/factory"
import {
  cartToShipEngineShipment,
  rateToShippingOption,
} from "../../../../modules/shipengine/mapping"
import {
  packItems,
  resolveContainerType,
  CONTAINER_WEIGHTS,
  type PackableItem,
  type PackedBox,
} from "../../../../modules/shipping-common/packing"
import {
  normaliseRate,
  serviceDisplayName as normalisedServiceName,
  type CarrierGroup,
  type DeliveryBehaviour,
  type ServiceTier,
} from "../../../../modules/shipping-common/normalise"
import { getAusPostClient } from "../../../../modules/auspost/factory"
import {
  quoteService as auspostQuoteService,
  type RateOptions as AusPostRateOptions,
  type ShipmentQuote as AusPostShipmentQuote,
} from "../../../../modules/auspost/mapping"
import type { PacServiceCode } from "../../../../modules/auspost/types"

type CarrierRate = {
  id: string
  name: string
  amount: number
  currency_code: string
  price_type: "calculated"
  provider_id: string
  // v2 enrichment
  carrier_group: CarrierGroup
  carrier_display_name: string
  service_tier: ServiceTier
  delivery_behaviour: DeliveryBehaviour
  is_default_behaviour: boolean
  // v3: pre-quoted with-signature sibling, present only on non-signature rows that have a sibling
  signature_sibling?: {
    rate_id: string
    amount: number
    delta_cents: number
  }
  data: {
    rate_id: string
    carrier_id: string
    carrier_code: string
    carrier_friendly_name?: string
    service_code: string
    service_type?: string
    delivery_days?: number | null
    estimated_delivery_date?: string | null
    rate_quoted_at: string
    cover_total_aud?: number    // v3: AusPost - cover allocated for this rate (0 if none)
  }
}

type CarrierRateGroup = {
  carrier_group: CarrierGroup
  carrier_display_name: string
  rates: CarrierRate[]
}

type DebugInfo = {
  shipengine?: {
    rate_count: number
    invalid_rate_count: number
    invalid_rates: Array<{
      carrier_code?: string
      service_code?: string
      error_messages?: string[]
    }>
    errors: Array<{ message: string }>
  }
  auspost?: {
    enabled: boolean
    rate_count: number
    errors: string[]
    require_signature: boolean
  }
}

/**
 * GET /store/shipping/rates?cart_id=:id&require_signature=true&debug=1
 *
 * v2: returns rates enriched with carrier_group / service_tier / delivery_behaviour
 * plus an optional carrier-grouped layout. When require_signature=true, AusPost
 * forces SOD on regardless of subtotal, and ShipEngine rates filter to only
 * delivery_behaviour=signature variants. Carriers with no signature variant on
 * the lane are listed in carrier_unavailable.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cartId = req.query.cart_id as string | undefined
  const requireSignature = parseBool(req.query.require_signature as string | undefined)
  const debug = parseBool(req.query.debug as string | undefined)

  if (!cartId) {
    res.status(400).json({ message: "cart_id query param is required" })
    return
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  let cart: any
  try {
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "currency_code", "subtotal", "shipping_address.*", "items.*"],
      filters: { id: cartId },
    })
    cart = carts?.[0] ?? null
  } catch (err) {
    logger.warn(`[shipping/rates] cart query failed: ${(err as Error).message}`)
    res.json({ rates: [], groups: [], best_price_rate_id: null, carrier_unavailable: [], error: "cart_not_found" })
    return
  }

  if (!cart) {
    res.json({ rates: [], groups: [], best_price_rate_id: null, carrier_unavailable: [], error: "cart_not_found" })
    return
  }

  if (!cart?.shipping_address?.country_code) {
    res.json({ rates: [], groups: [], best_price_rate_id: null, carrier_unavailable: [] })
    return
  }
  if (cart.shipping_address.country_code.toLowerCase() !== "au") {
    res.json({ rates: [], groups: [], best_price_rate_id: null, carrier_unavailable: [] })
    return
  }

  // ---------- SiteConfig helper ----------
  let siteConfig: { get(key: string): Promise<unknown> } | null = null
  try {
    siteConfig = req.scope.resolve("siteConfig") as { get(key: string): Promise<unknown> }
  } catch {
    /* fall back to defaults */
  }
  const sc = async <T>(key: string, fb: T) => {
    if (!siteConfig) return fb
    try {
      const v = await siteConfig.get(key)
      return v === null || v === undefined ? fb : (v as T)
    } catch {
      return fb
    }
  }

  // ---------- Build packed boxes once ----------
  const defaultWeightG = await sc<number>("shipping_default_item_weight_g", 750)
  const variantIds = (cart.items ?? [])
    .map((it: any) => it.variant_id)
    .filter(Boolean) as string[]

  const variantWeightMap: Record<string, { weight: number; containerType: string }> = {}
  if (variantIds.length) {
    try {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "weight", "options.value", "options.option.title"],
        filters: { id: variantIds },
      })
      for (const v of variants as any[]) {
        let format = "Can"
        for (const opt of v.options ?? []) {
          if (opt.option?.title === "Format" || opt.option?.title === "format") {
            format = opt.value ?? "Can"
            break
          }
        }
        const ct = resolveContainerType(format)
        variantWeightMap[v.id] = {
          weight: v.weight ?? CONTAINER_WEIGHTS[ct] ?? defaultWeightG,
          containerType: format,
        }
      }
    } catch (err) {
      logger.warn(`[shipping/rates] variant query failed, using defaults: ${(err as Error).message}`)
    }
  }

  const packableItems: PackableItem[] = (cart.items ?? []).map((it: any) => {
    const info = variantWeightMap[it.variant_id]
    const containerType = resolveContainerType(info?.containerType)
    return {
      quantity: typeof it.quantity === "number" ? it.quantity : Number(it.quantity ?? 1),
      weightG: info?.weight ?? CONTAINER_WEIGHTS[containerType] ?? defaultWeightG,
      containerType,
    }
  })

  const packages: PackedBox[] = packItems(packableItems)
  if (!packages.length) {
    packages.push({ weightG: defaultWeightG, lengthCm: 22, widthCm: 16, heightCm: 7 })
  }

  const currency = (cart.currency_code ?? "aud").toLowerCase()
  const debugInfo: DebugInfo = {}

  // ---------- Fan out to providers in parallel ----------
  const [seResult, apResult] = await Promise.all([
    fetchShipEngineRates({ packages, cart, sc, logger, currency, debug, debugInfo }),
    fetchAusPostRates({ packages, cart, sc, logger, currency, requireSignature, debug, debugInfo }),
  ])

  let allRates: CarrierRate[] = [...seResult.rates, ...apResult.rates]

  // v3 sibling pairing for ShipEngine: within each (carrier_group, service_tier) pair,
  // a non-signature standard rate becomes the visible row and gains a `signature_sibling`
  // pointing at the cheapest signature variant of the same carrier+tier.
  // For AusPost, the sibling is already attached during quoting.
  pairShipEngineSiblings(allRates)

  // Legacy require_signature support: when set, swap each visible base row to its sibling
  // so the customer doesn't see a toggle and the storefront default-selects signature.
  // Per-row toggle is the v3 default; this just keeps the admin/debug pathway useful.
  if (requireSignature) {
    const idMap = new Map(allRates.map((r) => [r.id, r] as const))
    allRates = allRates.map((r) => {
      if (r.delivery_behaviour !== "signature" && r.signature_sibling) {
        const sib = idMap.get(r.signature_sibling.rate_id)
        return sib ?? r
      }
      return r
    })
  }

  // Optional dedup within (carrier, service_tier, delivery_behaviour) - keep cheapest
  const dedup = await sc<boolean>("shipping_dedup_within_carrier", true)
  if (dedup) {
    const seen = new Map<string, CarrierRate>()
    for (const r of allRates) {
      const key = `${r.carrier_group}|${r.service_tier}|${r.delivery_behaviour}`
      const existing = seen.get(key)
      if (!existing || r.amount < existing.amount) seen.set(key, r)
    }
    allRates = Array.from(seen.values())
  }

  allRates.sort((a, b) => a.amount - b.amount)

  // Build groups: include only base rates (non-signature when a sibling exists,
  // OR signature-only rates that are the carrier's only option in that tier).
  const visibleRateIds = new Set<string>()
  for (const r of allRates) {
    if (r.delivery_behaviour === "signature") {
      // Suppress from groups iff some other rate's signature_sibling points at us.
      const isSibling = allRates.some((other) => other.signature_sibling?.rate_id === r.id)
      if (isSibling) continue
    }
    visibleRateIds.add(r.id)
  }

  const order = await sc<CarrierGroup[]>("shipping_carrier_order", [
    "australia_post",
    "aramex",
    "couriers_please",
  ])
  const byGroup = new Map<CarrierGroup, CarrierRateGroup>()
  for (const r of allRates) {
    if (!visibleRateIds.has(r.id)) continue
    let g = byGroup.get(r.carrier_group)
    if (!g) {
      g = {
        carrier_group: r.carrier_group,
        carrier_display_name: r.carrier_display_name,
        rates: [],
      }
      byGroup.set(r.carrier_group, g)
    }
    g.rates.push(r)
  }
  const groups: CarrierRateGroup[] = []
  for (const k of order) {
    const g = byGroup.get(k)
    if (g) groups.push(g)
  }
  for (const [k, g] of byGroup) {
    if (!order.includes(k)) groups.push(g)
  }

  // Best price across visible rows only
  const visibleSorted = allRates.filter((r) => visibleRateIds.has(r.id))
  const bestPriceRateId = visibleSorted.length ? visibleSorted[0].id : null

  res.json({
    rates: allRates,        // includes hidden signature siblings for selection lookup
    groups,                 // visible rows only
    best_price_rate_id: bestPriceRateId,
    require_signature: requireSignature,
    ...(debug ? { debug: debugInfo } : {}),
  })
}

/**
 * Pair ShipEngine signature variants with their non-signature counterparts within
 * the same (carrier_group, service_tier). Non-signature row gets a signature_sibling
 * pointing at the cheapest matching signature variant.
 */
function pairShipEngineSiblings(rates: CarrierRate[]): void {
  // Index signature variants by (carrier_group, service_tier), cheapest first
  const sigByBucket = new Map<string, CarrierRate>()
  for (const r of rates) {
    if (r.provider_id !== "shipengine" || r.delivery_behaviour !== "signature") continue
    const key = `${r.carrier_group}|${r.service_tier}`
    const existing = sigByBucket.get(key)
    if (!existing || r.amount < existing.amount) sigByBucket.set(key, r)
  }
  for (const r of rates) {
    if (r.provider_id !== "shipengine") continue
    if (r.delivery_behaviour === "signature") continue
    if (r.delivery_behaviour === "leave_at_door") continue // ATL stays its own row
    if (r.signature_sibling) continue
    const key = `${r.carrier_group}|${r.service_tier}`
    const sig = sigByBucket.get(key)
    if (!sig) continue
    r.signature_sibling = {
      rate_id: sig.id,
      amount: sig.amount,
      delta_cents: Math.max(0, sig.amount - r.amount),
    }
  }
}

// ---------- helpers ----------

function parseBool(v: string | undefined): boolean {
  if (!v) return false
  const s = v.toLowerCase()
  return s === "true" || s === "1" || s === "yes"
}

function enrich(rate: any, options?: string[]): CarrierRate {
  const norm = normaliseRate({
    provider_id: rate.provider_id,
    carrier_code: rate.data?.carrier_code,
    service_code: rate.data?.service_code,
    service_type: rate.data?.service_type,
    options,
  })
  // Override the display name with the normalised friendly version when raw is generic.
  const friendlyName = normalisedServiceName({
    provider_id: rate.provider_id,
    carrier_code: rate.data?.carrier_code,
    service_code: rate.data?.service_code,
    service_type: rate.data?.service_type,
  })
  return {
    ...rate,
    name: friendlyName || rate.name,
    carrier_group: norm.carrier_group,
    carrier_display_name: norm.carrier_display_name,
    service_tier: norm.service_tier,
    delivery_behaviour: norm.delivery_behaviour,
    is_default_behaviour: norm.is_default_behaviour,
  }
}

// ---------- ShipEngine fetch ----------

async function fetchShipEngineRates(args: {
  packages: PackedBox[]
  cart: any
  sc: <T>(key: string, fb: T) => Promise<T>
  logger: any
  currency: string
  debug: boolean
  debugInfo: DebugInfo
}): Promise<{ rates: CarrierRate[] }> {
  const { packages, cart, sc, logger, currency, debug, debugInfo } = args
  const carrierIds = await sc<string[]>("shipengine_carrier_ids", ["se-5530570", "se-5530571"])
  const fromAddress = {
    shipping_from_name: await sc<string>("shipping_from_name", "Hops & Glory"),
    shipping_from_phone: await sc<string>("shipping_from_phone", "+61 400 000 000"),
    shipping_from_address_1: await sc<string>("shipping_from_address_1", "1 Hillside Lane"),
    shipping_from_city: await sc<string>("shipping_from_city", "Hillside"),
    shipping_from_state: await sc<string>("shipping_from_state", "VIC"),
    shipping_from_postcode: await sc<string>("shipping_from_postcode", "3037"),
    shipping_from_country: await sc<string>("shipping_from_country", "AU"),
  }
  const validateMode = await sc<"no_validation" | "validate_only" | "validate_and_clean">(
    "shipping_validate_address_mode",
    "validate_and_clean",
  )

  const body = cartToShipEngineShipment({
    shippingAddress: cart.shipping_address,
    packages,
    fromAddress,
    carrierIds,
    validateMode,
  })

  const client = getShipEngineClient()
  let rates: any[] = []
  let invalidRates: any[] = []
  let errors: any[] = []
  try {
    const response = await client.getRates(body)
    rates = response?.rate_response?.rates ?? []
    invalidRates = response?.rate_response?.invalid_rates ?? []
    errors = response?.rate_response?.errors ?? []
    if (!rates.length && errors.length) {
      logger.warn(`[shipping/rates] shipengine returned errors: ${JSON.stringify(errors.map((e: any) => e.message))}`)
    }
  } catch (err) {
    logger.warn(`[shipping/rates] shipengine getRates failed: ${(err as Error).message}`)
    if (debug) {
      debugInfo.shipengine = {
        rate_count: 0,
        invalid_rate_count: 0,
        invalid_rates: [],
        errors: [{ message: (err as Error).message }],
      }
    }
    return { rates: [] }
  }

  if (debug) {
    debugInfo.shipengine = {
      rate_count: rates.length,
      invalid_rate_count: invalidRates.length,
      invalid_rates: invalidRates.map((r: any) => ({
        carrier_code: r.carrier_code,
        service_code: r.service_code,
        error_messages: r.error_messages ?? [],
      })),
      errors: errors.map((e: any) => ({ message: e.message })),
    }
  }

  const out = rates
    .map((r) => {
      try {
        const ephemeral = rateToShippingOption(r, currency)
        return enrich(ephemeral)
      } catch {
        return null
      }
    })
    .filter((o): o is CarrierRate => o !== null)
  return { rates: out }
}

// ---------- AusPost fetch ----------

async function fetchAusPostRates(args: {
  packages: PackedBox[]
  cart: any
  sc: <T>(key: string, fb: T) => Promise<T>
  logger: any
  currency: string
  requireSignature: boolean
  debug: boolean
  debugInfo: DebugInfo
}): Promise<{ rates: CarrierRate[] }> {
  const { packages, cart, sc, logger, currency, requireSignature, debug, debugInfo } = args

  const enabled = await sc<boolean>("auspost_enabled", false)
  if (!enabled) {
    if (debug) {
      debugInfo.auspost = { enabled: false, rate_count: 0, errors: [], require_signature: requireSignature }
    }
    return { rates: [] }
  }

  const fromPostcode = await sc<string>("shipping_from_postcode", "3037")
  const toPostcode = (cart.shipping_address?.postal_code ?? "").trim()
  if (!toPostcode || !/^\d{4}$/.test(toPostcode)) {
    logger.info(`[shipping/rates] auspost: missing or invalid postcode (${toPostcode}); skipping`)
    if (debug) {
      debugInfo.auspost = {
        enabled: true,
        rate_count: 0,
        errors: [`invalid postcode: ${toPostcode || "<empty>"}`],
        require_signature: requireSignature,
      }
    }
    return { rates: [] }
  }
  if (currency !== "aud") return { rates: [] }

  const services = await sc<string[]>("auspost_services_enabled", ["AUS_PARCEL_REGULAR", "AUS_PARCEL_EXPRESS"])
  const opts: AusPostRateOptions = {
    coverThresholdAud: await sc<number>("auspost_extra_cover_threshold_aud", 200),
    sodTriggerAud: await sc<number>("auspost_sod_trigger_aud", 300),
    discountPctStandard: await sc<number>("auspost_discount_pct_standard", 0),
    discountPctExpress: await sc<number>("auspost_discount_pct_express", 0),
  }

  const cartSubtotalAud = Math.max(0, ((cart.subtotal ?? 0) as number) / 100)
  const client = getAusPostClient()
  const now = new Date().toISOString()

  const validServices = services.filter(
    (s): s is PacServiceCode => s === "AUS_PARCEL_REGULAR" || s === "AUS_PARCEL_EXPRESS",
  )

  // v3: For each enabled service, quote BOTH states (without and with SOD) in parallel.
  // Pair them so the without-SOD row shows a `signature_sibling` toggle on the storefront.
  type PairedQuote = {
    serviceCode: PacServiceCode
    base?: AusPostShipmentQuote
    sig?: AusPostShipmentQuote
    baseErr?: string
    sigErr?: string
  }
  const pairs: PairedQuote[] = await Promise.all(
    validServices.map(async (serviceCode): Promise<PairedQuote> => {
      const [baseRes, sigRes] = await Promise.allSettled([
        auspostQuoteService({
          client,
          packedBoxes: packages,
          fromPostcode,
          toPostcode,
          serviceCode,
          cartSubtotalAud,
          opts,
          forceSod: false,
        }),
        auspostQuoteService({
          client,
          packedBoxes: packages,
          fromPostcode,
          toPostcode,
          serviceCode,
          cartSubtotalAud,
          opts,
          forceSod: true,
        }),
      ])
      const out: PairedQuote = { serviceCode }
      if (baseRes.status === "fulfilled") out.base = baseRes.value
      else out.baseErr = `${serviceCode} base: ${baseRes.reason?.message ?? baseRes.reason}`
      if (sigRes.status === "fulfilled") out.sig = sigRes.value
      else out.sigErr = `${serviceCode} sig: ${sigRes.reason?.message ?? sigRes.reason}`
      return out
    }),
  )

  const out: CarrierRate[] = []
  const errs: string[] = []
  for (const pair of pairs) {
    if (pair.baseErr) {
      logger.warn(`[shipping/rates] auspost ${pair.baseErr}`)
      errs.push(pair.baseErr)
    }
    if (pair.sigErr) {
      logger.warn(`[shipping/rates] auspost ${pair.sigErr}`)
      errs.push(pair.sigErr)
    }
    if (!pair.base) continue

    const baseRate = auspostQuoteToCarrierRate(pair.base, currency, now, false)
    if (pair.sig) {
      const sigRate = auspostQuoteToCarrierRate(pair.sig, currency, now, true)
      // Attach sibling pointer to the base row
      baseRate.signature_sibling = {
        rate_id: sigRate.id,
        amount: sigRate.amount,
        delta_cents: Math.max(0, sigRate.amount - baseRate.amount),
      }
      out.push(baseRate)
      out.push(sigRate)
    } else {
      out.push(baseRate)
    }
  }

  if (debug) {
    debugInfo.auspost = {
      enabled: true,
      rate_count: out.length,
      errors: errs,
      require_signature: requireSignature,
    }
  }
  return { rates: out }
}

function auspostQuoteToCarrierRate(
  quote: AusPostShipmentQuote,
  currency: string,
  quotedAt: string,
  isSignatureVariant: boolean,
): CarrierRate {
  const rateId = `auspost-${quote.serviceCode.toLowerCase()}-${isSignatureVariant ? "sig-" : "std-"}${Date.now()}`
  const isExpress = quote.serviceCode === "AUS_PARCEL_EXPRESS"
  const baseRate = {
    id: rateId,
    name: "", // overwritten by enrich()
    amount: quote.customer_total_cents,
    currency_code: currency,
    price_type: "calculated" as const,
    provider_id: "auspost" as const,
    data: {
      rate_id: rateId,
      carrier_id: "auspost",
      carrier_code: "australia_post",
      carrier_friendly_name: "Australia Post",
      service_code: quote.serviceCode,
      service_type: isExpress ? "Express Post" : "Parcel Post",
      delivery_days: isExpress ? 2 : 4,
      estimated_delivery_date: null,
      rate_quoted_at: quotedAt,
      cover_total_aud: quote.cover_total_aud,
    },
  }
  const options = quote.sod_added ? ["AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY"] : []
  return enrich(baseRate as any, options)
}
