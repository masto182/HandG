import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createAdminAuth } from "../helpers/admin-auth"

jest.setTimeout(180_000)

medusaIntegrationTestRunner({
  // These specs are sequential/stateful (later tests build on earlier
  // mutations) and seed shared data in beforeAll. Disable the per-test
  // TRUNCATE teardown so that data persists across the file's tests.
  disableAutoTeardown: true,
  testSuite: ({ api, getContainer }) => {
    describe("admin /products/:id/collab-breweries endpoint", () => {
      let adminAuth: { headers: Record<string, string> }
      let productId = ""
      let breweryA: any
      let breweryB: any
      let breweryC: any

      beforeAll(async () => {
        const container = getContainer()
        adminAuth = await createAdminAuth(api, container)

        const breweryService = container.resolve("brewery") as any
        breweryA = await breweryService.createBreweries({
          name: "CE Brewery A",
          slug: "ce-brewery-a",
          is_active: true,
        })
        breweryB = await breweryService.createBreweries({
          name: "CE Brewery B",
          slug: "ce-brewery-b",
          is_active: true,
        })
        breweryC = await breweryService.createBreweries({
          name: "CE Brewery C",
          slug: "ce-brewery-c",
          is_active: true,
        })

        const productModule = container.resolve("product") as any
        const created = await productModule.createProducts({
          title: "Collab Endpoint Test Beer",
          handle: `collab-endpoint-test-${Date.now()}`,
          status: "published",
          metadata: { brewery_slug: breweryA.slug, brewery_name: breweryA.name },
        })
        productId = Array.isArray(created) ? created[0].id : created.id

        const link = container.resolve("link") as any
        await link.create({
          brewery: { brewery_id: breweryA.id },
          product: { product_id: productId },
        })
        await link.create({
          brewery: { brewery_id: breweryB.id },
          product: { product_id: productId },
        })
      })

      it("GET returns current collab brewery slugs (excluding primary)", async () => {
        const res = await api.get(`/admin/products/${productId}/collab-breweries`, adminAuth)
        expect(res.status).toBe(200)
        expect(res.data.collab_brewery_slugs).toEqual(["ce-brewery-b"])
      })

      it("POST diffs add and remove correctly and emits product.updated", async () => {
        const container = getContainer()
        const eventBus = container.resolve("event_bus") as any
        const emitSpy = jest.spyOn(eventBus, "emit")

        const res = await api.post(
          `/admin/products/${productId}/collab-breweries`,
          { brewery_slugs: ["ce-brewery-c"] },
          adminAuth
        )

        expect(res.status).toBe(200)
        expect(res.data.collab_brewery_slugs).toEqual(["ce-brewery-c"])
        expect(res.data.added).toEqual(["ce-brewery-c"])
        expect(res.data.removed).toEqual(["ce-brewery-b"])

        const productUpdatedEmitted = emitSpy.mock.calls.some((call) => {
          const events = Array.isArray(call[0]) ? call[0] : [call[0]]
          return events.some((e: any) => e?.name === "product.updated" && e?.data?.id === productId)
        })
        expect(productUpdatedEmitted).toBe(true)
        emitSpy.mockRestore()

        const reread = await api.get(`/admin/products/${productId}/collab-breweries`, adminAuth)
        expect(reread.data.collab_brewery_slugs).toEqual(["ce-brewery-c"])
      })

      it("POST with empty brewery_slugs removes all collabs", async () => {
        const res = await api.post(
          `/admin/products/${productId}/collab-breweries`,
          { brewery_slugs: [] },
          adminAuth
        )
        expect(res.status).toBe(200)
        expect(res.data.collab_brewery_slugs).toEqual([])
        expect(res.data.removed).toEqual(["ce-brewery-c"])

        const reread = await api.get(`/admin/products/${productId}/collab-breweries`, adminAuth)
        expect(reread.data.collab_brewery_slugs).toEqual([])
      })

      it("POST returns 400 when brewery_slugs is missing", async () => {
        try {
          await api.post(`/admin/products/${productId}/collab-breweries`, {}, adminAuth)
          fail("expected 400")
        } catch (e: any) {
          expect(e.response.status).toBe(400)
        }
      })

      it("POST records unknown slugs and skips them", async () => {
        const res = await api.post(
          `/admin/products/${productId}/collab-breweries`,
          { brewery_slugs: ["does-not-exist-xyz"] },
          adminAuth
        )
        expect(res.status).toBe(200)
        expect(res.data.unknown).toEqual(["does-not-exist-xyz"])
        expect(res.data.collab_brewery_slugs).toEqual([])
      })
    })
  },
})
