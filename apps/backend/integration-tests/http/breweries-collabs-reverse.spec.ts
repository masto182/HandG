import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

jest.setTimeout(180_000)

medusaIntegrationTestRunner({
  disableAutoTeardown: true,
  testSuite: ({ api, getContainer }) => {
    describe("store /breweries/:slug/collabs reverse lookup", () => {
      let breweryA: any
      let breweryB: any
      let primaryProduct: any
      let collabProduct: any
      let storeHeaders: { headers: Record<string, string> }

      beforeAll(async () => {
        const container = getContainer()
        const breweryService = container.resolve("brewery") as any
        breweryA = await breweryService.createBreweries({
          name: "RL Brewery A",
          slug: "rl-brewery-a",
          is_active: true,
        })
        breweryB = await breweryService.createBreweries({
          name: "RL Brewery B",
          slug: "rl-brewery-b",
          is_active: true,
        })

        const productModule = container.resolve("product") as any
        primaryProduct = await productModule.createProducts({
          title: "RL Primary Only Beer",
          handle: `rl-primary-${Date.now()}`,
          status: "published",
          metadata: { brewery_slug: breweryA.slug, brewery_name: breweryA.name },
        })
        primaryProduct = Array.isArray(primaryProduct) ? primaryProduct[0] : primaryProduct

        collabProduct = await productModule.createProducts({
          title: "RL Collab Beer",
          handle: `rl-collab-${Date.now()}`,
          status: "published",
          metadata: { brewery_slug: breweryA.slug, brewery_name: breweryA.name },
        })
        collabProduct = Array.isArray(collabProduct) ? collabProduct[0] : collabProduct

        const link = container.resolve("link") as any
        await link.create({
          brewery: { brewery_id: breweryA.id },
          product: { product_id: primaryProduct.id },
        })
        await link.create({
          brewery: { brewery_id: breweryA.id },
          product: { product_id: collabProduct.id },
        })
        await link.create({
          brewery: { brewery_id: breweryB.id },
          product: { product_id: collabProduct.id },
        })

        // Store routes require a publishable API key linked to a sales channel.
        const apiKeyModule = container.resolve("api_key") as any
        const salesChannelModule = container.resolve("sales_channel") as any
        let [channel] = await salesChannelModule.listSalesChannels({})
        if (!channel) {
          channel = await salesChannelModule.createSalesChannels({ name: "Default" })
        }
        const key = await apiKeyModule.createApiKeys({
          title: "collabs-reverse-test-pk",
          type: "publishable",
          created_by: "test",
        } as any)
        const linkSvc = container.resolve("link") as any
        try {
          await linkSvc.create({
            api_key: { publishable_key_id: key.id },
            sales_channel: { sales_channel_id: channel.id },
          })
        } catch {}
        storeHeaders = { headers: { "x-publishable-api-key": key.token } }
      })

      it("GET /store/breweries/:slug/collabs returns products where the brewery is a collaborator (not primary)", async () => {
        const res = await api.get(`/store/breweries/${breweryB.slug}/collabs`, storeHeaders)
        expect(res.status).toBe(200)
        expect(res.data.count).toBe(1)
        expect(res.data.collabs[0].id).toBe(collabProduct.id)
        expect(res.data.collabs[0].primary_brewery_name).toBe(breweryA.name)
      })

      it("GET /store/breweries/:slug/collabs for the primary brewery returns no collabs (primary, not partner)", async () => {
        const res = await api.get(`/store/breweries/${breweryA.slug}/collabs`, storeHeaders)
        expect(res.status).toBe(200)
        expect(res.data.count).toBe(0)
      })

      it("returns 404 for unknown brewery slug", async () => {
        try {
          await api.get(`/store/breweries/does-not-exist-rl/collabs`, storeHeaders)
          fail("expected 404")
        } catch (e: any) {
          expect(e.response.status).toBe(404)
        }
      })
    })
  },
})
