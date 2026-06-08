import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createAdminAuth } from "../helpers/admin-auth"

jest.setTimeout(180_000)

medusaIntegrationTestRunner({
  disableAutoTeardown: true,
  testSuite: ({ api, getContainer }) => {
    describe("admin /stock-import bulk loader", () => {
      let adminAuth: { headers: Record<string, string> }
      let salesChannelId = ""

      beforeAll(async () => {
        const container = getContainer()
        adminAuth = await createAdminAuth(api, container)

        const salesChannelModule = container.resolve("sales_channel") as any
        let [channel] = await salesChannelModule.listSalesChannels({})
        if (!channel) {
          channel = await salesChannelModule.createSalesChannels({ name: "Default" })
        }
        salesChannelId = channel.id

        // Seed a brewery the loader can resolve without auto-create
        const breweryService = container.resolve("brewery") as any
        const existing = await breweryService.listBreweries({ slug: "mountain-culture-it" })
        if (!existing.length) {
          await breweryService.createBreweries({
            name: "Mountain Culture IT",
            slug: "mountain-culture-it",
            is_active: true,
          })
        }
      })

      it("creates a product with collab links, hop links, images, anniversary, release_at; auto-creates unknown breweries and hops", async () => {
        const csv =
          "name,brewery,style,abv,price,stock,container,collab_breweries,hops,images,release_at,is_anniversary\n" +
          'IT Bulk Test Beer,Mountain Culture IT,Double IPA,8.0,15,24,Can 440ml,"Range IT,Hop Nation IT","Citra IT,Mosaic IT","https://example.com/a.jpg,https://example.com/b.jpg",2030-06-01T18:00:00+10:00,true\n'

        const res = await api.post(
          "/admin/stock-import",
          {
            csv,
            options: {
              auto_create_breweries: true,
              auto_create_hops: true,
              dry_run: false,
            },
          },
          adminAuth
        )

        expect(res.status).toBe(200)
        expect(res.data.created).toBe(1)
        expect(res.data.errors).toEqual([])
        expect(res.data.auto_created_breweries).toEqual(
          expect.arrayContaining(["Range IT", "Hop Nation IT"])
        )
        expect(res.data.auto_created_hops).toEqual(
          expect.arrayContaining(["Citra IT", "Mosaic IT"])
        )

        const container = getContainer()
        const productModule = container.resolve("product") as any
        const [product] = await productModule.listProducts(
          { title: "IT Bulk Test Beer" },
          { relations: ["images"] }
        )
        expect(product).toBeDefined()
        expect(product.metadata.brewery_name).toBe("Mountain Culture IT")
        expect(product.metadata.brewery_slug).toBe("mountain-culture-it")
        expect(product.metadata.style).toBe("Double IPA")
        expect(product.metadata.abv).toBe("8.0")
        expect(product.metadata.is_anniversary).toBe(true)
        expect(product.metadata.early_access_until).toBe(
          new Date("2030-06-01T18:00:00+10:00").toISOString()
        )
        expect(product.metadata.hops).toEqual(expect.arrayContaining(["Citra IT", "Mosaic IT"]))
        expect(product.thumbnail).toBe("https://example.com/a.jpg")
        expect(Array.isArray(product.images)).toBe(true)
        expect(product.images.map((i: any) => i.url)).toEqual([
          "https://example.com/a.jpg",
          "https://example.com/b.jpg",
        ])

        // Brewery <-> product links: primary + 2 collabs = 3
        const query = container.resolve("query") as any
        const { data: linked } = await query.graph({
          entity: "product",
          fields: ["breweries.id", "breweries.slug", "hops.id", "hops.slug"],
          filters: { id: product.id },
        })
        const breweries = (linked?.[0] as any)?.breweries || []
        const hops = (linked?.[0] as any)?.hops || []
        expect(breweries.length).toBe(3)
        const slugs = breweries.map((b: any) => b.slug).sort()
        expect(slugs).toEqual(["hop-nation-it", "mountain-culture-it", "range-it"])
        const hopSlugs = hops.map((h: any) => h.slug).sort()
        expect(hopSlugs).toEqual(["citra-it", "mosaic-it"])

        const breweryService = container.resolve("brewery") as any
        const [rangeBrewery] = await breweryService.listBreweries({ slug: "range-it" })
        expect(rangeBrewery.is_active).toBe(true)

        const hopService = container.resolve("hop") as any
        const [citraHop] = await hopService.listHops({ slug: "citra-it" })
        expect(citraHop.is_active).toBe(false)
      })

      it("dry run mode reports without writing", async () => {
        const csv =
          "name,brewery,style,abv,price,stock,container,collab_breweries,hops\n" +
          'Dry Run Beer,Mountain Culture IT,IPA,6.5,12,5,Can 440ml,"Other Half DR",Citra DR\n'

        const res = await api.post(
          "/admin/stock-import",
          {
            csv,
            options: {
              auto_create_breweries: true,
              auto_create_hops: true,
              dry_run: true,
            },
          },
          adminAuth
        )

        expect(res.status).toBe(200)
        expect(res.data.dry_run).toBe(true)
        expect(res.data.would_create).toBe(1)
        expect(res.data.would_create_titles).toContain("Dry Run Beer")
        expect(res.data.would_auto_create_breweries).toContain("Other Half DR")

        const container = getContainer()
        const productModule = container.resolve("product") as any
        const products = await productModule.listProducts({ title: "Dry Run Beer" })
        expect(products.length).toBe(0)

        const breweryService = container.resolve("brewery") as any
        const breweries = await breweryService.listBreweries({ slug: "other-half-dr" })
        expect(breweries.length).toBe(0)
      })

      it("re-import preserves hops on empty cell, replaces on populated", async () => {
        const baseCsv =
          "name,brewery,style,abv,price,stock,container,hops\n" +
          'Merge Test Beer,Mountain Culture IT,IPA,6.0,10,5,Can 440ml,"Galaxy MT,Simcoe MT"\n'

        await api.post(
          "/admin/stock-import",
          {
            csv: baseCsv,
            options: { auto_create_hops: true, dry_run: false },
          },
          adminAuth
        )

        // Re-import with empty hops cell -> preserve
        const emptyCsv =
          "name,brewery,style,abv,price,stock,container,hops\n" +
          "Merge Test Beer,Mountain Culture IT,IPA,6.0,10,5,Can 440ml,\n"

        await api.post(
          "/admin/stock-import",
          { csv: emptyCsv, options: { dry_run: false } },
          adminAuth
        )

        const container = getContainer()
        const productModule = container.resolve("product") as any
        const [product] = await productModule.listProducts({ title: "Merge Test Beer" })
        expect(product.metadata.hops).toEqual(expect.arrayContaining(["Galaxy MT", "Simcoe MT"]))

        const query = container.resolve("query") as any
        const { data } = await query.graph({
          entity: "product",
          fields: ["hops.slug"],
          filters: { id: product.id },
        })
        const hopSlugsAfterEmpty = ((data?.[0] as any)?.hops || []).map((h: any) => h.slug).sort()
        expect(hopSlugsAfterEmpty).toEqual(["galaxy-mt", "simcoe-mt"])

        // Re-import with populated different hops -> replace metadata.hops (links may union, but metadata reflects new)
        const replaceCsv =
          "name,brewery,style,abv,price,stock,container,hops\n" +
          "Merge Test Beer,Mountain Culture IT,IPA,6.0,10,5,Can 440ml,Nelson MT\n"

        await api.post(
          "/admin/stock-import",
          {
            csv: replaceCsv,
            options: { auto_create_hops: true, dry_run: false },
          },
          adminAuth
        )

        const [updated] = await productModule.listProducts({ title: "Merge Test Beer" })
        expect(updated.metadata.hops).toEqual(["Nelson MT"])
      })
    })
  },
})
