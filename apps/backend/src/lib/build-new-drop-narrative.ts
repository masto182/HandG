import type { AlertCategory } from "./resolve-new-drop-recipients"

/**
 * Section-placement priority - brewery leads, hop is secondary, all_new is
 * the generic fallback. Mirrors KIND_RANK in resolve-new-drop-recipients.ts
 * and CATEGORY_RANK in manage-new-drop-batch.ts.
 */
const CATEGORY_RANK: Record<AlertCategory, number> = {
  brewery_releases: 3,
  hop_alerts: 2,
  new_drops: 1,
}

export type NarrativeItem = {
  product_id: string
  category: AlertCategory
  matched_brewery_names: string[]
  matched_hop_names: string[]
}

export type NarrativeItemWithTag<T extends NarrativeItem = NarrativeItem> = T & {
  hopTag: string | null
}

export type NarrativeSection<T extends NarrativeItem = NarrativeItem> = {
  label: string
  items: T[]
}

export type Narrative<T extends NarrativeItem = NarrativeItem> = {
  brewerySection: NarrativeSection<NarrativeItemWithTag<T>> | null
  hopSection: NarrativeSection<T> | null
  generalSection: { items: T[] } | null
  /** null means every applicable section was filtered out - skip the send. */
  leadCategory: AlertCategory | null
}

/** Joins names as "A", "A and B", or "A, B and C" - no Oxford comma. */
export function joinNames(names: string[]): string {
  const unique = [...new Set(names.filter(Boolean))]
  if (unique.length === 0) return ""
  if (unique.length === 1) return unique[0]
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`
  return `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`
}

/**
 * Builds the personalized narrative for one recipient's items: a brewery
 * section (beers from followed breweries, tagged with any matched hop name
 * even though hop didn't win placement), a hop section (beers matching a
 * followed hop but NOT from a followed brewery - the natural leftover after
 * brewery placement), and a general section (blanket new-drops opt-in
 * only). Per-category opt-in is applied here as a CONTENT FILTER - an
 * opted-out category's items are dropped from the narrative entirely,
 * rather than gating a separate email. If nothing survives, `leadCategory`
 * is null and the caller should skip sending.
 */
export function buildNewDropNarrative<T extends NarrativeItem>(
  items: T[],
  optedInCategories: Set<AlertCategory>
): Narrative<T> {
  const included = items.filter((i) => optedInCategories.has(i.category))

  const breweryItems = included.filter((i) => i.category === "brewery_releases")
  const hopItems = included.filter((i) => i.category === "hop_alerts")
  const generalItems = included.filter((i) => i.category === "new_drops")

  const brewerySection: Narrative<T>["brewerySection"] = breweryItems.length
    ? {
        label: joinNames(breweryItems.flatMap((i) => i.matched_brewery_names)),
        items: breweryItems.map((i) => ({
          ...i,
          hopTag: i.matched_hop_names.length ? joinNames(i.matched_hop_names) : null,
        })),
      }
    : null

  const hopSection: Narrative<T>["hopSection"] = hopItems.length
    ? {
        label: joinNames(hopItems.flatMap((i) => i.matched_hop_names)),
        items: hopItems,
      }
    : null

  const generalSection = generalItems.length ? { items: generalItems } : null

  let leadCategory: AlertCategory | null = null
  for (const category of ["brewery_releases", "hop_alerts", "new_drops"] as const) {
    const present =
      (category === "brewery_releases" && brewerySection) ||
      (category === "hop_alerts" && hopSection) ||
      (category === "new_drops" && generalSection)
    if (present && (!leadCategory || CATEGORY_RANK[category] > CATEGORY_RANK[leadCategory])) {
      leadCategory = category
    }
  }

  return { brewerySection, hopSection, generalSection, leadCategory }
}
