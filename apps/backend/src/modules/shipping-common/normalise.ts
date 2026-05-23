/**
 * Normalisation helpers for shipping rates returned from multiple providers.
 *
 * Producers (ShipEngine for CouriersPlease + Aramex, AusPost PAC) emit their
 * own service-code conventions. Storefront and admin UI need a single shape
 * with consistent "speed tier", "delivery behaviour", and carrier grouping
 * fields. This module is the single source of truth for that mapping.
 *
 * Heuristics tuned against the actual codes returned by the live accounts as
 * of 2026-05-18:
 *
 *   CouriersPlease:
 *     - couriersplease_walleted_parcel
 *
 *   Aramex AU (carrier code aramex_au_walleted plus Fastway sub-brand):
 *     - aramex_au_walleted_standard
 *     - aramex_au_walleted_leave_at_door
 *     - aramex_au_walleted_signature_required
 *     - fastway_au_walleted_priority    (Fastway = Aramex Priority Overnight)
 *
 *   AusPost PAC:
 *     - AUS_PARCEL_REGULAR
 *     - AUS_PARCEL_EXPRESS
 *     plus options:
 *       - AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY
 *       - AUS_SERVICE_OPTION_EXTRA_COVER
 */

export type ServiceTier = "standard" | "express"
export type DeliveryBehaviour = "attempted" | "leave_at_door" | "signature"
export type CarrierGroup = "australia_post" | "couriers_please" | "aramex" | "other"

export type NormaliseInput = {
  provider_id: string             // "shipengine" | "auspost"
  carrier_code?: string | null    // raw from rate response
  service_code: string            // raw from rate response
  service_type?: string | null    // free-text label from carrier
  options?: string[]              // present for AusPost (option_codes applied at quote time)
}

export type NormalisedRate = {
  service_tier: ServiceTier
  delivery_behaviour: DeliveryBehaviour
  is_default_behaviour: boolean
  carrier_group: CarrierGroup
  carrier_display_name: string    // e.g. "Australia Post", "Aramex", "CouriersPlease"
}

const SIGNATURE_OPTION = "AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY"

/**
 * Classify the speed tier (standard vs express) from carrier + service_code.
 */
export function classifyServiceTier(input: NormaliseInput): ServiceTier {
  const code = (input.service_code ?? "").toLowerCase()
  if (
    code.includes("express") ||
    code.includes("priority") ||
    code.includes("overnight") ||
    code.includes("fastway") // Fastway Priority is Aramex's overnight product
  ) {
    return "express"
  }
  return "standard"
}

/**
 * Classify the doorstep behaviour the driver will exhibit on delivery.
 *
 * For ShipEngine carriers, behaviour is encoded in the service_code. For
 * AusPost, behaviour is determined by whether SOD was added as an option
 * at quote time.
 */
export function classifyDeliveryBehaviour(input: NormaliseInput): DeliveryBehaviour {
  const code = (input.service_code ?? "").toLowerCase()
  const opts = (input.options ?? []).map((o) => o.toUpperCase())

  if (input.provider_id === "auspost") {
    if (opts.includes(SIGNATURE_OPTION)) return "signature"
    return "attempted"
  }

  // ShipEngine variants
  if (
    code.includes("signature_required") ||
    code.includes("with_signature_on_delivery") ||
    code.includes("signature_on_delivery")
  ) {
    return "signature"
  }
  if (
    code.includes("leave_at_door") ||
    code.endsWith("_atl") ||
    code.includes("authority_to_leave")
  ) {
    return "leave_at_door"
  }
  return "attempted"
}

/**
 * The carrier's default delivery behaviour - used to decide whether to show
 * the chip on a rate row in the storefront. If a rate matches the carrier's
 * default, no chip is needed.
 */
export function carrierDefaultBehaviour(group: CarrierGroup): DeliveryBehaviour {
  // Every supported AU carrier defaults to attempted-delivery (driver knocks;
  // if no answer, takes parcel back / leaves card).
  return "attempted"
}

/**
 * Map provider + carrier_code + service_code into a stable carrier grouping
 * key plus a display name. Aramex's sub-brand Fastway is folded into Aramex.
 */
export function isCarrierGroup(input: NormaliseInput): {
  group: CarrierGroup
  displayName: string
} {
  if (input.provider_id === "auspost") {
    return { group: "australia_post", displayName: "Australia Post" }
  }
  const carrier = (input.carrier_code ?? "").toLowerCase()
  const service = (input.service_code ?? "").toLowerCase()

  if (carrier.includes("australia_post") || carrier === "auspost" || service.startsWith("aus_parcel")) {
    return { group: "australia_post", displayName: "Australia Post" }
  }
  if (carrier.includes("aramex") || service.startsWith("aramex_") || service.startsWith("fastway_")) {
    return { group: "aramex", displayName: "Aramex" }
  }
  if (carrier.includes("couriers_please") || carrier.includes("couriersplease") || service.startsWith("couriersplease")) {
    return { group: "couriers_please", displayName: "CouriersPlease" }
  }
  return { group: "other", displayName: input.carrier_code ?? "Other" }
}

/**
 * Single-call normaliser - returns everything the storefront needs to render
 * a rate in the new grouped UX.
 */
export function normaliseRate(input: NormaliseInput): NormalisedRate {
  const { group, displayName } = isCarrierGroup(input)
  const service_tier = classifyServiceTier(input)
  const delivery_behaviour = classifyDeliveryBehaviour(input)
  const default_behaviour = carrierDefaultBehaviour(group)
  return {
    service_tier,
    delivery_behaviour,
    is_default_behaviour: delivery_behaviour === default_behaviour,
    carrier_group: group,
    carrier_display_name: displayName,
  }
}

/**
 * Pretty service name for display - takes raw service_code/service_type and
 * returns a friendly label. Strips carrier-specific prefixes.
 */
export function serviceDisplayName(input: NormaliseInput): string {
  const { group } = isCarrierGroup(input)
  const code = input.service_code

  if (group === "australia_post") {
    if (code === "AUS_PARCEL_EXPRESS") return "Express Post"
    if (code === "AUS_PARCEL_REGULAR") return "Parcel Post"
  }
  if (group === "aramex") {
    if (code.includes("fastway") && code.includes("priority")) return "Priority (overnight)"
    if (code.includes("leave_at_door")) return "Road Express - Leave at door"
    if (code.includes("signature_required")) return "Road Express - Signature"
    if (code.includes("standard")) return "Road Express"
  }
  if (group === "couriers_please") {
    if (code.includes("parcel")) return "Standard parcel"
  }
  // Fallback - use the carrier-supplied service_type or raw code
  return input.service_type ?? code
}
