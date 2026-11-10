import {
  buildAuStreetLine,
  isSameUnit,
  normaliseAuAddress,
  splitLeadingUnit,
} from "@retail-example/shared-types"

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

const streetKey = (a: AddressLike) => {
  const n = normaliseAuAddress(a.address_1, a.address_2)
  const split = splitLeadingUnit(n.address_1)
  return { unit: split.unit, street: split.street, extra: n.address_2 }
}

export function isSameAddress(a: AddressLike, b: AddressLike): boolean {
  const sa = streetKey(a)
  const sb = streetKey(b)
  const sameUnit = (!sa.unit && !sb.unit) || isSameUnit(sa.unit, sb.unit)
  return (
    sameUnit &&
    norm(sa.street) === norm(sb.street) &&
    norm(sa.extra) === norm(sb.extra) &&
    IDENTITY_FIELDS.every(
      (f) =>
        f === "address_1" || f === "address_2" || norm(a[f]) === norm(b[f]),
    )
  )
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
    buildAuStreetLine(addr.address_2, addr.address_1),
    addr.city,
    addr.province,
    addr.postal_code,
  ]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(", ")
}

export const COURIER_NOTE_MAX = 60

export function normaliseCourierNote(v: unknown): string {
  if (typeof v !== "string") return ""
  return v.replace(/\s+/g, " ").trim().slice(0, COURIER_NOTE_MAX)
}

export function courierNoteOf(
  addr?: { metadata?: Record<string, unknown> | null } | null,
): string {
  return normaliseCourierNote(addr?.metadata?.courier_note)
}

export function withCourierNote(
  metadata: Record<string, unknown> | null | undefined,
  note: string,
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) }
  next.courier_note = normaliseCourierNote(note)
  return next
}
