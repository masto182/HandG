type AddressLike = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
}

type SavedAddressLike = AddressLike & {
  is_default_shipping?: boolean | null
  updated_at?: string | Date | null
  created_at?: string | Date | null
}

const IDENTITY_FIELDS: (keyof AddressLike)[] = [
  "first_name",
  "last_name",
  "company",
  "address_1",
  "address_2",
  "city",
  "province",
  "postal_code",
  "country_code",
]

const norm = (v: string | null | undefined) =>
  (v ?? "").trim().replace(/\s+/g, " ").toLowerCase()

export function isSameAddress(a: AddressLike, b: AddressLike): boolean {
  return IDENTITY_FIELDS.every((f) => norm(a[f]) === norm(b[f]))
}

const timeOf = (a: SavedAddressLike) =>
  new Date(a.updated_at ?? a.created_at ?? 0).getTime() || 0

export function sortSavedAddresses<T extends SavedAddressLike>(
  addresses: T[],
): T[] {
  return [...addresses].sort((a, b) => {
    const d = Number(!!b.is_default_shipping) - Number(!!a.is_default_shipping)
    return d !== 0 ? d : timeOf(b) - timeOf(a)
  })
}

export function formatAddressSummary(addr: AddressLike): string {
  return [
    addr.address_2,
    addr.address_1,
    addr.city,
    addr.province,
    addr.postal_code,
  ]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(", ")
}
