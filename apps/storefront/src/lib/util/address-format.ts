import { normaliseAuAddress } from "@retail-example/shared-types"

type StreetFields = {
  address_1?: string | null
  address_2?: string | null
  country_code?: string | null
}

export function withAuStreetLine<T extends StreetFields>(address: T): T {
  const country = (address.country_code || "au").toLowerCase()
  if (country !== "au") return address
  return {
    ...address,
    ...normaliseAuAddress(address.address_1, address.address_2),
  }
}
