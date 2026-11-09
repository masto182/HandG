export const MEMBER_SORT_FIELDS = [
  "name",
  "email",
  "tier",
  "vip_score",
  "referred_by",
  "created_at",
  "last_active",
  "why_join",
] as const

export type MemberSortField = (typeof MEMBER_SORT_FIELDS)[number]

export type MemberSort = { field: MemberSortField; desc: boolean }

export const parseMemberSort = (raw?: string): MemberSort | null => {
  if (!raw) return null
  const desc = raw.startsWith("-")
  const field = (desc ? raw.slice(1) : raw) as MemberSortField
  return MEMBER_SORT_FIELDS.includes(field) ? { field, desc } : null
}

export const tierRank = (groups: string[]): number => {
  if (groups.includes("suspended")) return 0
  const vip = groups.find((g) => /^vip\d/.test(g))
  if (vip) return 10 + parseInt(vip.slice(3), 10)
  if (groups.includes("approved")) return 2
  return 1
}

export type SortKey = string | number | null

export const compareSortKeys = (a: SortKey, b: SortKey, desc: boolean): number => {
  const aNull = a === null || a === ""
  const bNull = b === null || b === ""
  if (aNull && bNull) return 0
  if (aNull) return 1
  if (bNull) return -1
  const cmp =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
  return desc ? -cmp : cmp
}

export const sortByKey = <T>(
  items: T[],
  keyOf: (item: T) => SortKey,
  desc: boolean,
  tieBreak: (item: T) => string
): T[] =>
  items
    .map((item) => ({ item, key: keyOf(item) }))
    .sort(
      (x, y) =>
        compareSortKeys(x.key, y.key, desc) || tieBreak(x.item).localeCompare(tieBreak(y.item))
    )
    .map((x) => x.item)
