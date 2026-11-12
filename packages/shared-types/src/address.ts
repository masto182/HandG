const UNIT_TOKEN = String.raw`[A-Za-z]+\.?\s*#?\s*[A-Za-z]?\d+[A-Za-z]?`
const LEADING_NUMBER_UNIT = /^(\d+)\s*\/\s*(\d.*)$/
const LEADING_WORD_UNIT = new RegExp(
  String.raw`^((?:${UNIT_TOKEN})(?:\s*,?\s*${UNIT_TOKEN})*)\s*[,/]?\s*(\d.*)$`
)
const LEADING_CODE_UNIT = /^([A-Za-z]?\d+[A-Za-z]|[A-Za-z]\d+)\s*\/\s*(\d.*)$/
const UNIT_WORDS = /^(?:unit|apartment|apt|flat|u)\.?\s*#?\s*/i

const clean = (value?: string | null) => (value ?? "").replace(/\s+/g, " ").trim()

export function formatUnit(unit?: string | null): string {
  return clean(unit)
    .split(" ")
    .map((word) =>
      /\d/.test(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ")
}

const unitKey = (unit: string) => clean(unit).replace(UNIT_WORDS, "").toLowerCase()

export function isSameUnit(a?: string | null, b?: string | null): boolean {
  return !!clean(a) && !!clean(b) && unitKey(a as string) === unitKey(b as string)
}

export function splitLeadingUnit(street?: string | null): { unit: string | null; street: string } {
  const text = clean(street)
  const match =
    text.match(LEADING_NUMBER_UNIT) ||
    text.match(LEADING_CODE_UNIT) ||
    text.match(LEADING_WORD_UNIT)
  if (!match) return { unit: null, street: text }
  return { unit: formatUnit(match[1].replace(/,\s*$/, "")), street: clean(match[2]) }
}

export function resolveAuPick(pick: {
  typed?: string | null
  subpremise?: string | null
  streetNumber?: string | null
  route?: string | null
}): { address_1: string; corrected: boolean } {
  const googleNumber = clean(pick.streetNumber)
  const route = clean(pick.route)
  const typed = splitLeadingUnit(pick.typed)
  const typedNumber = typed.unit ? (typed.street.match(/^(\d+[A-Za-z]?)\b/)?.[1] ?? "") : ""
  if (typed.unit && typedNumber && typedNumber.toLowerCase() !== googleNumber.toLowerCase()) {
    return { address_1: buildAuStreetLine(typed.unit, `${typedNumber} ${route}`), corrected: true }
  }
  const unit = formatUnit(pick.subpremise) || typed.unit
  return { address_1: buildAuStreetLine(unit, `${googleNumber} ${route}`), corrected: false }
}

export function splitAuAddressForForm(
  address_1: string | null | undefined,
  address_2: string | null | undefined
): { unit: string; street: string } {
  const leading = splitLeadingUnit(address_1)
  const extra = formatUnit(address_2)
  if (!leading.unit) return { unit: extra, street: leading.street }
  if (!extra || isSameUnit(leading.unit, extra))
    return { unit: extra || leading.unit, street: leading.street }
  return { unit: `${leading.unit}, ${extra}`, street: leading.street }
}

export function buildAuStreetLine(
  unit: string | null | undefined,
  street: string | null | undefined
): string {
  const base = clean(street)
  const text = formatUnit(unit)
  if (!text) return base
  if (!base) return text
  if (/^\d+$/.test(text)) return `${text}/${base}`
  return `${text}, ${base}`
}

export function normaliseAuAddress(
  address_1: string | null | undefined,
  address_2: string | null | undefined
): { address_1: string; address_2: string } {
  const leading = splitLeadingUnit(address_1)
  const unit = formatUnit(address_2)
  if (!unit) return { address_1: buildAuStreetLine(leading.unit, leading.street), address_2: "" }
  if (!leading.unit) return { address_1: buildAuStreetLine(unit, leading.street), address_2: "" }
  if (unitKey(leading.unit) === unitKey(unit)) {
    const keep = /[A-Za-z]/.test(unit) ? unit : leading.unit
    return { address_1: buildAuStreetLine(keep, leading.street), address_2: "" }
  }
  return { address_1: buildAuStreetLine(leading.unit, leading.street), address_2: unit }
}
