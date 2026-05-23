import { test, expect } from "@playwright/test"

const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL || "http://localhost:9000"
const MEILI_URL = process.env.MEILI_URL || "http://localhost:7700"
const MEILI_KEY = process.env.MEILI_MASTER_KEY || ""
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

test.describe("Search Facet Integrity — MeiliSearch vs Store API", () => {
  test("Facet distribution matches store product count for top category", async ({ request }) => {
    const meiliRes = await request.post(`${MEILI_URL}/indexes/products/search`, {
      headers: {
        "Authorization": MEILI_KEY ? `Bearer ${MEILI_KEY}` : "",
        "Content-Type": "application/json",
      },
      data: {
        q: "",
        facets: ["category_handle", "collection_handle", "type"],
        limit: 0,
      },
    })

    if (!meiliRes.ok()) {
      test.skip(true, `MeiliSearch not available (status ${meiliRes.status()})`)
    }

    const meiliData = await meiliRes.json()
    const facets = meiliData.facetDistribution || {}

    const categoryFacets = facets.category_handle || facets.collection_handle || facets.type || {}
    const facetKeys = Object.keys(categoryFacets)
    test.skip(facetKeys.length === 0, "No facets returned from MeiliSearch — index may be empty")

    const topFacet = facetKeys[0]
    const meiliCount = categoryFacets[topFacet]

    const storeRes = await request.get(`${BACKEND}/store/products?limit=200&category_id[]=${topFacet}`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    })

    if (storeRes.ok()) {
      const storeData = await storeRes.json()
      const storeCount = storeData.count ?? storeData.products?.length ?? 0
      expect(meiliCount).toBe(storeCount)
    } else {
      const collectionRes = await request.get(`${BACKEND}/store/products?limit=200&collection_id[]=${topFacet}`, {
        headers: {
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
      })
      expect(collectionRes.ok()).toBeTruthy()
      const collectionData = await collectionRes.json()
      const collectionCount = collectionData.count ?? collectionData.products?.length ?? 0
      expect(meiliCount).toBe(collectionCount)
    }
  })

  test("Total document count matches store product total (published only)", async ({ request }) => {
    const meiliStatsRes = await request.get(`${MEILI_URL}/indexes/products/stats`, {
      headers: {
        "Authorization": MEILI_KEY ? `Bearer ${MEILI_KEY}` : "",
      },
    })

    if (!meiliStatsRes.ok()) {
      test.skip(true, `MeiliSearch stats not available (status ${meiliStatsRes.status()})`)
    }

    const meiliStats = await meiliStatsRes.json()
    const meiliTotal = meiliStats.numberOfDocuments ?? 0

    const storeRes = await request.get(`${BACKEND}/store/products?limit=1&offset=0`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    })
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
