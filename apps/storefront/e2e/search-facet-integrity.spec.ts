import { test, expect } from "@playwright/test"

const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL || "http://localhost:9000"
const MEILI_URL = process.env.MEILI_URL || "http://localhost:7700"
const MEILI_KEY = process.env.MEILI_MASTER_KEY || ""
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

test.describe("Search Facet Integrity — MeiliSearch vs Store API", () => {
  test("Facet count for the top style family equals its filtered hit count", async ({
    request,
  }) => {
    const meiliHeaders = {
      Authorization: MEILI_KEY ? `Bearer ${MEILI_KEY}` : "",
      "Content-Type": "application/json",
    }
    // This catalog facets on real product attributes (style_family / style /
    // hops), not Medusa categories/collections. Verify index integrity: the
    // facet count reported for a value must equal the number of documents that
    // actually match a filter on that value.
    const facetRes = await request.post(
      `${MEILI_URL}/indexes/products/search`,
      {
        headers: meiliHeaders,
        data: { q: "", facets: ["style_family", "style"], limit: 0 },
      },
    )
    if (!facetRes.ok()) {
      test.skip(true, `MeiliSearch not available (status ${facetRes.status()})`)
    }
    const facetData = await facetRes.json()
    const facets = facetData.facetDistribution || {}
    const styleFamilies = facets.style_family || {}
    const familyKeys = Object.keys(styleFamilies)
    test.skip(
      familyKeys.length === 0,
      "No style_family facets returned — index may be empty",
    )

    // Pick the style family with the most products and confirm a filtered query
    // returns exactly that many documents.
    const topFamily = familyKeys.sort(
      (a, b) => styleFamilies[b] - styleFamilies[a],
    )[0]
    const facetCount = styleFamilies[topFamily]

    const filterRes = await request.post(
      `${MEILI_URL}/indexes/products/search`,
      {
        headers: meiliHeaders,
        data: {
          q: "",
          filter: `style_family = ${JSON.stringify(topFamily)}`,
          limit: 0,
        },
      },
    )
    expect(filterRes.ok()).toBeTruthy()
    const filterData = await filterRes.json()
    const filteredTotal =
      filterData.estimatedTotalHits ?? filterData.totalHits ?? 0
    expect(filteredTotal).toBe(facetCount)
  })

  test("Total document count matches store product total (published only)", async ({
    request,
  }) => {
    const meiliStatsRes = await request.get(
      `${MEILI_URL}/indexes/products/stats`,
      {
        headers: {
          Authorization: MEILI_KEY ? `Bearer ${MEILI_KEY}` : "",
        },
      },
    )

    if (!meiliStatsRes.ok()) {
      test.skip(
        true,
        `MeiliSearch stats not available (status ${meiliStatsRes.status()})`,
      )
    }

    const meiliStats = await meiliStatsRes.json()
    const meiliTotal = meiliStats.numberOfDocuments ?? 0

    const storeRes = await request.get(
      `${BACKEND}/store/products?limit=1&offset=0`,
      {
        headers: {
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
      },
    )
    expect(storeRes.ok()).toBeTruthy()
    const storeData = await storeRes.json()
    const storeTotal = storeData.count ?? 0

    if (meiliTotal > storeTotal) {
      const drift = meiliTotal - storeTotal
      test.info().annotations.push({
        type: "drift-detected",
        description: `MeiliSearch has ${drift} stale docs (${meiliTotal} indexed vs ${storeTotal} published). Fix: npx medusa exec ./src/scripts/reindex-search.ts`,
      })
      expect(meiliTotal).toBeLessThanOrEqual(storeTotal)
      return
    }

    expect(meiliTotal).toBe(storeTotal)
  })
})
