import { isCarrierGroup } from "../modules/shipping-common/normalise"
import { carrierTrackingUrl } from "../modules/shipping-common/tracking-url"

export { carrierTrackingUrl }

export type ShipmentTracking = {
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
}

type FulfillmentLike = {
  provider_id?: string | null
  data?: Record<string, unknown> | null
  labels?: Array<{ tracking_number?: string | null; tracking_url?: string | null }> | null
}

function providerKey(providerId: string | null | undefined): string {
  const id = (providerId ?? "").toLowerCase()
  if (id.startsWith("auspost")) return "auspost"
  if (id.startsWith("shipengine")) return "shipengine"
  return id
}

export function resolveShipmentTracking(fulfillment: FulfillmentLike): ShipmentTracking {
  const data = fulfillment.data ?? {}
  const label = (fulfillment.labels ?? []).find((l) => l?.tracking_number) ?? undefined
  const trackingNumber =
    label?.tracking_number ||
    (typeof data.tracking_number === "string" ? data.tracking_number : "") ||
    undefined

  const carrierCode = typeof data.carrier_code === "string" ? data.carrier_code : null
  const serviceCode = typeof data.service_code === "string" ? data.service_code : ""
  const provider = providerKey(fulfillment.provider_id)
  const known = provider === "auspost" || !!carrierCode || !!serviceCode
  const { group, displayName } = isCarrierGroup({
    provider_id: provider,
    carrier_code: carrierCode,
    service_code: serviceCode,
  })
  const carrier = known && group !== "other" ? displayName : undefined

  const trackingUrl =
    label?.tracking_url ||
    (trackingNumber ? carrierTrackingUrl(group, trackingNumber) : undefined) ||
    undefined

  return { carrier, trackingNumber, trackingUrl }
}
