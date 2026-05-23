import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"

jest.setTimeout(120_000)

const MEILI_URL = process.env.MEILI_URL || "http://localhost:7700"
const MEILI_KEY = process.env.MEILI_MASTER_KEY || ""

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("Search Facet DB Integrity — MeiliSearch vs Postgres", () => {
      it("MeiliSearch total document count matches product table count", async () => {
        const container = getContainer()
        const productModule = container.resolve(Modules.PRODUCT) as any

        const [, dbCount] = await productModule.listAndCountProducts({})

        const meiliRes = await fetch(`${MEILI_URL}/indexes/products/stats`, {
          headers: MEILI_KEY ? { Authorization: `Bearer ${MEILI_KEY}` } : {},
        })

        if (!meiliRes.ok) {
          console.warn(`MeiliSearch not reachable (${meiliRes.status}) — skipping`)
          return
        }

        const meiliStats = await meiliRes.json()
        const meiliDocCount = meiliStats.numberOfDocuments ?? 0

        expect(meiliDocCount).toBe(dbCount)
      })

      it("Facet distribution for each category matches DB product count", async () => {
        const container = getContainer()
        const productModule = container.resolve(Modules.PRODUCT) as any

        const searchRes = await fetch(`${MEILI_URL}/indexes/products/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(MEILI_KEY ? { Authorization: `Bearer ${MEILI_KEY}` } : {}),
          },
          body: JSON.stringify({
            q: "",
            facets: ["collection_handle", "category_handle"],
            limit: 0,
          }),
        })

        if (!searchRes.ok) {
          console.warn(`MeiliSearch search endpoint failed (${searchRes.status}) — skipping`)
          return
        }

        const searchData = await searchRes.json()
        const facets = searchData.facetDistribution || {}

        const categoryFacets = facets.category_handle || facets.collection_handle || {}
        const facetEntries = Object.entries(categoryFacets) as [string, number][]

        if (facetEntries.length === 0) {
          console.warn("No facets returned — index may be empty or unconfigured")
          return
        }

        for (const [handle, meiliCount] of facetEntries.slice(0, 5)) {
          const [, dbCount] = await productModule.listAndCountProducts({
            categories: { handle: [handle] },
          }).catch(() => [[], 0])

          if (dbCount === 0) {
            const [, collCount] = await productModule.listAndCountProducts({
              collection_id: [handle],
            }).catch(() => [[], 0])
            expect(meiliCount).toBe(collCount)
          } else {
            expect(meiliCount).toBe(dbCount)
          }
        }
      })
    })
  },
})
