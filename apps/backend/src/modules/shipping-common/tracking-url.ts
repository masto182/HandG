import { isCarrierGroup, type CarrierGroup } from "./normalise"

export function carrierTrackingUrl(
  group: CarrierGroup,
  trackingNumber: string
): string | undefined {
  const n = encodeURIComponent(trackingNumber)
  switch (group) {
    case "aramex":
      return `https://www.aramex.com.au/tools/track?l=${n}`
    case "couriers_please":
      return `https://www.couriersplease.com.au/tools-track/no/${n}`
    case "australia_post":
      return `https://auspost.com.au/mypost/track/details/${n}`
    default:
      return undefined
  }
}

export function trackingUrlForCarrierCode(
  carrierCode: string | null | undefined,
  serviceCode: string | null | undefined,
  trackingNumber: string | null | undefined
): string {
  if (!trackingNumber || (!carrierCode && !serviceCode)) return ""
  const { group } = isCarrierGroup({
    provider_id: "shipengine",
    carrier_code: carrierCode ?? null,
    service_code: serviceCode ?? "",
  })
  return carrierTrackingUrl(group, trackingNumber) ?? ""
}
