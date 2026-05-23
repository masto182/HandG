/**
 * Mapping helpers between Hops & Glory packed boxes and AusPost PAC requests.
 *
 * The PAC API is one-call-per-parcel-per-service, so a multi-box shipment
 * fans out to N requests. We sum the resulting costs and apply pricing
 * adjustments here.
 */

import type { PackedBox } from "../shipping-common/packing"
import type {
  AusPostPacLikeClient,
  PacCalculateRequest,
  PacOptionCode,
  PacPostageResult,
  PacServiceCode,
} from "./types"
import { PAC_SERVICE_NAMES } from "./types"

// Live PAC API caps Extra Cover at $500 base / $5,000 with SOD as of 2026.
// Docs claim 300/5000 - the running API returns 500 - we use 500 to allow
// fuller cover but keep the SOD trigger conservative at $300 so the cap is
// always lifted before reaching the base limit.
export const PAC_COVER_CAP_BASE_AUD = 500
export const PAC_COVER_CAP_SOD_AUD = 5000

export type RateOptions = {
  coverThresholdAud: number // auto-add Extra Cover at/above
  sodTriggerAud: number     // auto-add SOD when subtotal exceeds (lifts cap)
  discountPctStandard: number
  discountPctExpress: number
}

export type PerBoxQuote = {
  box: PackedBox
  base_cents: number
  surcharges_cents: number
  cover_aud: number
}

export type ShipmentQuote = {
  serviceCode: PacServiceCode
  customer_total_cents: number   // what we charge the customer (after discount)
  rrp_total_cents: number        // raw PAC RRP without discount
  base_total_cents: number       // sum of base costs (before surcharges)
  surcharges_total_cents: number // SOD + Extra Cover combined
  per_box: PerBoxQuote[]
  sod_added: boolean
  cover_total_aud: number
}

/**
 * Given a service and the cart subtotal, compute the option codes to send
 * to PAC and how much cover to allocate per box.
 *
 * - Cover is auto-added when subtotal >= coverThresholdAud OR forceSod is true
 *   (signature opt-in always implies cover).
 * - SOD is auto-added when subtotal > sodTriggerAud (default $300) OR
 *   forceSod is true (customer-driven opt-in).
 */
export function computeOptions(
  cartSubtotalAud: number,
  packedBoxes: PackedBox[],
  opts: RateOptions,
  forceSod = false,
): {
  optionCodes: PacOptionCode[]
  perBoxCover: number[]
  sodAdded: boolean
  coverPerBox: number
} {
  const wantsSod = forceSod || cartSubtotalAud > opts.sodTriggerAud
  // When signature is forced we also want cover engaged so the customer
  // gets the lifted cap; otherwise cover follows the threshold.
  const wantsCover = wantsSod || cartSubtotalAud >= opts.coverThresholdAud

  const optionCodes: PacOptionCode[] = []
  if (wantsSod) optionCodes.push("AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY")
  if (wantsCover) optionCodes.push("AUS_SERVICE_OPTION_EXTRA_COVER")

  if (!wantsCover) {
    return { optionCodes, perBoxCover: packedBoxes.map(() => 0), sodAdded: wantsSod, coverPerBox: 0 }
  }

  const cap = wantsSod ? PAC_COVER_CAP_SOD_AUD : PAC_COVER_CAP_BASE_AUD
  const totalCover = Math.min(Math.ceil(cartSubtotalAud), cap * packedBoxes.length)
  const perBoxCover = allocateCover(packedBoxes, totalCover, cap)
  return { optionCodes, perBoxCover, sodAdded: wantsSod, coverPerBox: 0 }
}

/**
 * Distribute total cover across boxes proportional to weight share, capped
 * at perBoxCap per box. Returns integer AUD per box, sum <= totalCover.
 */
export function allocateCover(
  packedBoxes: PackedBox[],
  totalCover: number,
  perBoxCap: number,
): number[] {
  if (!packedBoxes.length || totalCover <= 0) return packedBoxes.map(() => 0)
  const totalWeight = packedBoxes.reduce((s, b) => s + b.weightG, 0)
  if (totalWeight <= 0) {
    // Even split fallback
    const each = Math.min(perBoxCap, Math.floor(totalCover / packedBoxes.length))
    return packedBoxes.map(() => each)
  }
  // Proportional to box weight, then cap, then redistribute leftovers
  const raw = packedBoxes.map((b) => (b.weightG / totalWeight) * totalCover)
  const capped = raw.map((v) => Math.min(perBoxCap, Math.round(v)))
  let remaining = Math.max(0, Math.round(totalCover) - capped.reduce((s, v) => s + v, 0))
  // Spread remaining into any boxes still under their cap
  for (let i = 0; i < capped.length && remaining > 0; i++) {
    const room = perBoxCap - capped[i]
    if (room <= 0) continue
    const give = Math.min(room, remaining)
    capped[i] += give
    remaining -= give
  }
  return capped
}

/**
 * Apply the per-service discount % to a base-rate amount in cents.
 * Discount only applies to the carrier base rate; SOD and Extra Cover
 * surcharges are passed through at PAC cost.
 */
export function applyDiscount(baseCents: number, pct: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return baseCents
  const clamped = Math.max(0, Math.min(95, pct)) // sanity-clamp to avoid free shipping bugs
  return Math.round(baseCents * (1 - clamped / 100))
}

/**
 * Read PAC's costs[] line items and split into base vs surcharges.
 * The base service line matches the service name (e.g. "Parcel Post").
 * Everything else (Signature on Delivery, Extra cover) is a surcharge.
 */
export function parseSurcharges(result: PacPostageResult): {
  base_cents: number
  surcharges_cents: number
} {
  const totalCents = decimalToCents(result.total_cost)
  const lines = result.costs?.cost ? toArray(result.costs.cost) : []
  if (!lines.length) {
    return { base_cents: totalCents, surcharges_cents: 0 }
  }
  const baseName = (result.service ?? "").toLowerCase()
  let base = 0
  let surcharges = 0
  for (const line of lines) {
    const cents = decimalToCents(line.cost)
    const item = (line.item ?? "").toLowerCase()
    // Match the service line to base; otherwise surcharge
    if (item === baseName || item === "parcel post" || item === "express post" || item === result.service.toLowerCase()) {
      base += cents
    } else {
      surcharges += cents
    }
  }
  // Reconciliation: if line items didn't sum to total, prefer total for accuracy
  if (Math.abs(base + surcharges - totalCents) > 1) {
    return { base_cents: totalCents - surcharges, surcharges_cents: surcharges }
  }
  return { base_cents: base, surcharges_cents: surcharges }
}

function decimalToCents(s: string | undefined | null): number {
  if (!s) return 0
  const n = Number.parseFloat(String(s))
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

function toArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : [v]
}

/**
 * Turn a PackedBox array + cart context into N PAC calculate requests
 * (one per box) for a given service.
 */
export function boxesToPacRequests(args: {
  packedBoxes: PackedBox[]
  fromPostcode: string
  toPostcode: string
  serviceCode: PacServiceCode
  perBoxCover: number[]
  optionCodes: PacOptionCode[]
}): PacCalculateRequest[] {
  return args.packedBoxes.map((box, i) => {
    const cover = args.perBoxCover[i] ?? 0
    const codes = [...args.optionCodes]
    return {
      fromPostcode: args.fromPostcode,
      toPostcode: args.toPostcode,
      lengthCm: box.lengthCm,
      widthCm: box.widthCm,
      heightCm: box.heightCm,
      weightKg: box.weightG / 1000,
      serviceCode: args.serviceCode,
      optionCode: codes.length ? codes : undefined,
      extraCover: cover > 0 ? cover : undefined,
    }
  })
}

/**
 * Drive the full quote pipeline for one service:
 *   computeOptions -> boxesToPacRequests -> client.calculate (per box)
 *   -> parseSurcharges -> applyDiscount -> ShipmentQuote
 */
export async function quoteService(args: {
  client: AusPostPacLikeClient
  packedBoxes: PackedBox[]
  fromPostcode: string
  toPostcode: string
  serviceCode: PacServiceCode
  cartSubtotalAud: number
  opts: RateOptions
  forceSod?: boolean
}): Promise<ShipmentQuote> {
  const { optionCodes, perBoxCover, sodAdded } = computeOptions(
    args.cartSubtotalAud,
    args.packedBoxes,
    args.opts,
    args.forceSod ?? false,
  )
  const reqs = boxesToPacRequests({
    packedBoxes: args.packedBoxes,
    fromPostcode: args.fromPostcode,
    toPostcode: args.toPostcode,
    serviceCode: args.serviceCode,
    perBoxCover,
    optionCodes,
  })

  const perBox: PerBoxQuote[] = []
  let baseTotal = 0
  let surchargeTotal = 0
  for (let i = 0; i < reqs.length; i++) {
    const result = await args.client.calculate(reqs[i])
    const { base_cents, surcharges_cents } = parseSurcharges(result)
    baseTotal += base_cents
    surchargeTotal += surcharges_cents
    perBox.push({
      box: args.packedBoxes[i],
      base_cents,
      surcharges_cents,
      cover_aud: perBoxCover[i] ?? 0,
    })
  }

  const discountPct =
    args.serviceCode === "AUS_PARCEL_EXPRESS"
      ? args.opts.discountPctExpress
      : args.opts.discountPctStandard
  const discountedBase = applyDiscount(baseTotal, discountPct)
  const customerTotal = discountedBase + surchargeTotal

  return {
    serviceCode: args.serviceCode,
    customer_total_cents: customerTotal,
    rrp_total_cents: baseTotal + surchargeTotal,
    base_total_cents: baseTotal,
    surcharges_total_cents: surchargeTotal,
    per_box: perBox,
    sod_added: sodAdded,
    cover_total_aud: perBoxCover.reduce((s, v) => s + v, 0),
  }
}

/**
 * Shipping option name shown to the customer at checkout.
 * "Australia Post - Standard" / "Australia Post - Express".
 */
export function serviceDisplayName(serviceCode: PacServiceCode): string {
  return PAC_SERVICE_NAMES[serviceCode] ?? serviceCode
}
