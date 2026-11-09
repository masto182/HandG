/**
 * One Medusa shipping option per carrier "service family". A family can group a
 * base service with variants that share one option. Aramex signature_required is
 * deliberately not offered: Aramex treats signature as best-effort only.
 *
 * Option data shape (stored on shipping_option.data, from getFulfillmentOptions):
 *   { id, family, provider, carrier_code?, base_service_code, service_codes }
 *
 * carrier_id is deliberately NOT stored: it is resolved at runtime from the
 * live rate response, so a carrier account rotation never strands an option.
 */

export type ServiceFamilyProvider = "shipengine" | "auspost"

export type ServiceFamily = {
  family: string
  provider: ServiceFamilyProvider
  name: string
  carrier_code?: string
  base_service_code: string
  service_codes: string[]
}

export const LEGACY_DYNAMIC_OPTION_IDS = ["shipengine-dynamic", "auspost-dynamic"] as const

export const SERVICE_FAMILIES: ServiceFamily[] = [
  {
    family: "aramex_road_express",
    provider: "shipengine",
    name: "Aramex Road Express",
    carrier_code: "aramex_au_walleted",
    base_service_code: "aramex_au_walleted_standard",
    service_codes: ["aramex_au_walleted_standard"],
  },
  {
    family: "aramex_road_express_leave_at_door",
    provider: "shipengine",
    name: "Aramex Road Express - Leave at Door",
    carrier_code: "aramex_au_walleted",
    base_service_code: "aramex_au_walleted_leave_at_door",
    service_codes: ["aramex_au_walleted_leave_at_door"],
  },
  {
    family: "aramex_priority",
    provider: "shipengine",
    name: "Aramex Priority (Overnight)",
    carrier_code: "aramex_au_walleted",
    base_service_code: "fastway_au_walleted_priority",
    service_codes: ["fastway_au_walleted_priority"],
  },
  {
    family: "couriersplease_parcel",
    provider: "shipengine",
    name: "CouriersPlease Parcel",
    carrier_code: "couriersplease_walleted",
    base_service_code: "couriersplease_walleted_parcel",
    service_codes: ["couriersplease_walleted_parcel"],
  },
  {
    family: "auspost_parcel_post",
    provider: "auspost",
    name: "Australia Post Parcel Post",
    carrier_code: "australia_post",
    base_service_code: "AUS_PARCEL_REGULAR",
    service_codes: ["AUS_PARCEL_REGULAR"],
  },
  {
    family: "auspost_express_post",
    provider: "auspost",
    name: "Australia Post Express Post",
    carrier_code: "australia_post",
    base_service_code: "AUS_PARCEL_EXPRESS",
    service_codes: ["AUS_PARCEL_EXPRESS"],
  },
]

export function familiesForProvider(provider: ServiceFamilyProvider): ServiceFamily[] {
  return SERVICE_FAMILIES.filter((f) => f.provider === provider)
}

export function familyOptionData(f: ServiceFamily): Record<string, unknown> {
  return {
    id: f.family,
    family: f.family,
    provider: f.provider,
    name: f.name,
    carrier_code: f.carrier_code,
    base_service_code: f.base_service_code,
    service_codes: [...f.service_codes],
    is_return: false,
  }
}

/**
 * Parse shipping_option.data into a family. Returns null for the legacy
 * *-dynamic options and for anything unrecognised.
 */
export function familyFromOptionData(
  data: Record<string, unknown> | null | undefined
): ServiceFamily | null {
  if (!data) return null
  const id = (data.family ?? data.id) as string | undefined
  if (!id || (LEGACY_DYNAMIC_OPTION_IDS as readonly string[]).includes(id)) return null
  const known = SERVICE_FAMILIES.find((f) => f.family === id)
  const codes = Array.isArray(data.service_codes)
    ? (data.service_codes as unknown[]).filter((c): c is string => typeof c === "string")
    : known?.service_codes
  const base = (data.base_service_code as string | undefined) ?? known?.base_service_code
  if (!codes?.length || !base) return null
  return {
    family: id,
    provider: ((data.provider as ServiceFamilyProvider | undefined) ?? known?.provider)!,
    name: (data.name as string | undefined) ?? known?.name ?? id,
    carrier_code: (data.carrier_code as string | undefined) ?? known?.carrier_code,
    base_service_code: base,
    service_codes: codes,
  }
}

export function isLegacyDynamicOption(data: Record<string, unknown> | null | undefined): boolean {
  const id = (data?.family ?? data?.id) as string | undefined
  return !id || (LEGACY_DYNAMIC_OPTION_IDS as readonly string[]).includes(id)
}

export function familyForServiceCode(
  serviceCode: string | null | undefined,
  provider?: ServiceFamilyProvider
): ServiceFamily | undefined {
  if (!serviceCode) return undefined
  return SERVICE_FAMILIES.find(
    (f) => (!provider || f.provider === provider) && f.service_codes.includes(serviceCode)
  )
}

export function familyIncludes(family: ServiceFamily, serviceCode: unknown): boolean {
  return typeof serviceCode === "string" && family.service_codes.includes(serviceCode)
}
