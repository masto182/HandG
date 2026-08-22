import { buildNewDropNarrative, joinNames } from "../../lib/build-new-drop-narrative"
import type { AlertCategory } from "../../lib/resolve-new-drop-recipients"

const item = (
  category: AlertCategory,
  breweryNames: string[] = [],
  hopNames: string[] = [],
  productId = "prod_1"
) => ({
  product_id: productId,
  category,
  matched_brewery_names: breweryNames,
  matched_hop_names: hopNames,
})

const ALL_CATEGORIES = new Set<AlertCategory>(["brewery_releases", "hop_alerts", "new_drops"])

describe("joinNames", () => {
  it("handles 0, 1, 2, and 3+ names", () => {
    expect(joinNames([])).toBe("")
    expect(joinNames(["Tree House"])).toBe("Tree House")
    expect(joinNames(["Tree House", "Fidens"])).toBe("Tree House and Fidens")
    expect(joinNames(["Tree House", "Fidens", "Brujos"])).toBe("Tree House, Fidens and Brujos")
  })

  it("dedupes", () => {
    expect(joinNames(["Citra", "Citra", "Peacherine"])).toBe("Citra and Peacherine")
  })
})

describe("buildNewDropNarrative", () => {
  it("brewery-only: lead category brewery, no hop/general section", () => {
    const out = buildNewDropNarrative([item("brewery_releases", ["Tree House"])], ALL_CATEGORIES)
    expect(out.leadCategory).toBe("brewery_releases")
    expect(out.brewerySection?.label).toBe("Tree House")
    expect(out.brewerySection?.items[0].hopTag).toBeNull()
    expect(out.hopSection).toBeNull()
    expect(out.generalSection).toBeNull()
  })

  it("brewery beer also tagged with a matched hop, still one section", () => {
    const out = buildNewDropNarrative(
      [item("brewery_releases", ["Tree House"], ["Citra"])],
      ALL_CATEGORIES
    )
    expect(out.leadCategory).toBe("brewery_releases")
    expect(out.brewerySection?.items[0].hopTag).toBe("Citra")
    expect(out.hopSection).toBeNull()
  })

  it("brewery section plus a separate hop section for beers outside followed breweries", () => {
    const out = buildNewDropNarrative(
      [
        item("brewery_releases", ["Tree House"], ["Citra"], "prod_1"),
        item("hop_alerts", [], ["Peacherine"], "prod_2"),
      ],
      ALL_CATEGORIES
    )
    expect(out.leadCategory).toBe("brewery_releases")
    expect(out.brewerySection?.items).toHaveLength(1)
    expect(out.hopSection?.items).toHaveLength(1)
    expect(out.hopSection?.label).toBe("Peacherine")
  })

  it("hop-only lead when no brewery match", () => {
    const out = buildNewDropNarrative([item("hop_alerts", [], ["Citra"])], ALL_CATEGORIES)
    expect(out.leadCategory).toBe("hop_alerts")
    expect(out.brewerySection).toBeNull()
    expect(out.hopSection?.label).toBe("Citra")
  })

  it("multi-brewery and multi-hop naming across several items", () => {
    const out = buildNewDropNarrative(
      [
        item("brewery_releases", ["Tree House"], [], "prod_1"),
        item("brewery_releases", ["Fidens"], [], "prod_2"),
        item("hop_alerts", [], ["Citra"], "prod_3"),
        item("hop_alerts", [], ["Peacherine"], "prod_4"),
      ],
      ALL_CATEGORIES
    )
    expect(out.brewerySection?.label).toBe("Tree House and Fidens")
    expect(out.hopSection?.label).toBe("Citra and Peacherine")
  })

  it("opted out of hop_alerts drops the hop section but keeps the brewery section (and its hop tag)", () => {
    const out = buildNewDropNarrative(
      [
        item("brewery_releases", ["Tree House"], ["Citra"], "prod_1"),
        item("hop_alerts", [], ["Peacherine"], "prod_2"),
      ],
      new Set<AlertCategory>(["brewery_releases", "new_drops"])
    )
    expect(out.leadCategory).toBe("brewery_releases")
    expect(out.brewerySection?.items[0].hopTag).toBe("Citra")
    expect(out.hopSection).toBeNull()
  })

  it("everything opted out -> leadCategory null (skip send)", () => {
    const out = buildNewDropNarrative(
      [item("brewery_releases", ["Tree House"])],
      new Set<AlertCategory>(["hop_alerts", "new_drops"])
    )
    expect(out.leadCategory).toBeNull()
    expect(out.brewerySection).toBeNull()
  })

  it("all_new-only fallback populates the general section as lead", () => {
    const out = buildNewDropNarrative([item("new_drops")], ALL_CATEGORIES)
    expect(out.leadCategory).toBe("new_drops")
    expect(out.generalSection?.items).toHaveLength(1)
    expect(out.brewerySection).toBeNull()
    expect(out.hopSection).toBeNull()
  })
})
