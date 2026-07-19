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
        const allChannels = await salesChannelModule.listSalesChannels({})
        let channel = allChannels.find(
          (c: any) =>
            c.name.toLowerCase().includes("hops") || c.name.toLowerCase().includes("glory")
        )
        if (!channel) {
          channel = await salesChannelModule.createSalesChannels({ name: "Hops & Glory Store" })
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

        // Seed beer styles used across tests so style-mismatch errors don't
        // pollute the errors[] array in assertions that expect it to be empty.
        const beerStyleService = container.resolve("beerStyle") as any
        const existingStyles = await beerStyleService.listBeerStyles({})
        const seededNames = new Set(existingStyles.map((s: any) => s.name.toLowerCase()))
        const stylesToSeed = [
          { name: "Double IPA", slug: "double-ipa", family: "IPA" },
          { name: "IPA", slug: "ipa", family: "IPA" },
          { name: "Stout", slug: "stout", family: "Stout" },
        ]
        for (const style of stylesToSeed) {
          if (!seededNames.has(style.name.toLowerCase())) {
            await beerStyleService.createBeerStyles(style)
          }
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
          { relations: ["images", "tags"] }
        )
        expect(product).toBeDefined()
        expect(product.metadata.brewery_name).toBe("Mountain Culture IT")
        expect(product.metadata.brewery_slug).toBe("mountain-culture-it")
        expect(product.metadata.style).toBe("Double IPA")
        expect(product.metadata.abv).toBe("8.0")
        expect(product.metadata.is_anniversary).toBe(true)
        expect(product.tags.map((t: any) => t.value)).toContain("anniversary")
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

      it("stores description field in product.description on create", async () => {
        const csv =
          "name,brewery,style,abv,price,stock,container,description\n" +
          "Desc Test Beer,Mountain Culture IT,IPA,6.0,12,5,Can 440ml,Tropical and juicy with stone fruit\n"

        const res = await api.post(
          "/admin/stock-import",
          { csv, options: { dry_run: false } },
          adminAuth
        )

        expect(res.status).toBe(200)
        expect(res.data.created).toBe(1)
        expect(res.data.errors).toEqual([])

        const container = getContainer()
        const productModule = container.resolve("product") as any
        const [product] = await productModule.listProducts({ title: "Desc Test Beer" })
        expect(product.description).toBe("Tropical and juicy with stone fruit")
      })

      it("updates product.description on re-import", async () => {
        const container = getContainer()
        const productModule = container.resolve("product") as any

        const csv1 =
          "name,brewery,style,abv,price,stock,container,description\n" +
          "Desc Update Beer,Mountain Culture IT,IPA,6.0,12,5,Can 440ml,Original description\n"
        await api.post("/admin/stock-import", { csv: csv1, options: { dry_run: false } }, adminAuth)

        const csv2 =
          "name,brewery,style,abv,price,stock,container,description\n" +
          "Desc Update Beer,Mountain Culture IT,IPA,6.0,12,5,Can 440ml,Updated description\n"
        const res = await api.post(
          "/admin/stock-import",
          { csv: csv2, options: { dry_run: false } },
          adminAuth
        )

        expect(res.status).toBe(200)
        expect(res.data.updated).toBe(1)

        const [product] = await productModule.listProducts({ title: "Desc Update Beer" })
        expect(product.description).toBe("Updated description")
      })

      it("uses auto-generated description when description column is blank", async () => {
        const csv =
          "name,brewery,style,abv,price,stock,container\n" +
          "Auto Desc Beer,Mountain Culture IT,Double IPA,8.5,15,10,Can 440ml\n"

        const res = await api.post(
          "/admin/stock-import",
          { csv, options: { dry_run: false } },
          adminAuth
        )

        expect(res.status).toBe(200)
        expect(res.data.created).toBe(1)

        const container = getContainer()
        const productModule = container.resolve("product") as any
        const [product] = await productModule.listProducts({ title: "Auto Desc Beer" })
        expect(product.description).toBe("Double IPA — 8.5% ABV. Brewed by Mountain Culture IT")
      })

      it("skips row and reports error when abv is non-numeric", async () => {
        const csv =
          "name,brewery,style,abv,price,stock,container\n" +
          "Bad ABV Beer,Mountain Culture IT,IPA,eight,12,5,Can 440ml\n"

        const res = await api.post(
          "/admin/stock-import",
          { csv, options: { dry_run: false } },
          adminAuth
        )

        expect(res.status).toBe(200)
        expect(res.data.created).toBe(0)
        expect(res.data.errors).toHaveLength(1)
        expect(res.data.errors[0]).toContain("abv must be a number")

        const container = getContainer()
        const productModule = container.resolve("product") as any
        const products = await productModule.listProducts({ title: "Bad ABV Beer" })
        expect(products.length).toBe(0)
      })

      it("skips row and reports error when price is non-numeric", async () => {
        const csv =
          "name,brewery,style,abv,price,stock,container\n" +
          "Bad Price Beer,Mountain Culture IT,IPA,6.5,free,5,Can 440ml\n"

        const res = await api.post(
          "/admin/stock-import",
          { csv, options: { dry_run: false } },
          adminAuth
        )

        expect(res.status).toBe(200)
        expect(res.data.created).toBe(0)
        expect(res.data.errors).toHaveLength(1)
        expect(res.data.errors[0]).toContain("price must be a non-negative number")

        const container = getContainer()
        const productModule = container.resolve("product") as any
        const products = await productModule.listProducts({ title: "Bad Price Beer" })
        expect(products.length).toBe(0)
      })

      it("creates product but reports error when style does not match any BeerStyle", async () => {
        const csv =
          "name,brewery,style,abv,price,stock,container\n" +
          "Unknown Style Beer,Mountain Culture IT,Completely Made Up Style,6.5,12,5,Can 440ml\n"

        const res = await api.post(
          "/admin/stock-import",
          { csv, options: { dry_run: false } },
          adminAuth
        )

        expect(res.status).toBe(200)
        expect(res.data.created).toBe(1)
        expect(res.data.errors).toHaveLength(1)
        expect(res.data.errors[0]).toContain("style")
        expect(res.data.errors[0]).toContain("not found")

        const container = getContainer()
        const productModule = container.resolve("product") as any
        const [product] = await productModule.listProducts({ title: "Unknown Style Beer" })
        expect(product).toBeDefined()
      })

      it("GET export includes description column with correct value", async () => {
        // Create a product with a known description
        const csv =
          "name,brewery,style,abv,price,stock,container,description\n" +
          "Export Desc Beer,Mountain Culture IT,IPA,6.0,12,5,Can 440ml,Check this description exports\n"
        await api.post("/admin/stock-import", { csv, options: { dry_run: false } }, adminAuth)

        const exportRes = await api.get("/admin/stock-import", adminAuth)
        expect(exportRes.status).toBe(200)
        expect(typeof exportRes.data.csv).toBe("string")

        const lines = exportRes.data.csv.split("\n")
        const headers = lines[0].split(",")
        const descIdx = headers.indexOf("description")
        expect(descIdx).toBeGreaterThanOrEqual(0)

        const commentIdx = headers.indexOf("comment")
        expect(commentIdx).toBe(-1)

        const dataRow = lines.find((l: string) => l.includes("Export Desc Beer"))
        expect(dataRow).toBeDefined()

        // Parse the description cell at the correct column index.
        // Use simple split — no cells in this test row contain commas.
        const cells = dataRow!.split(",")
        const descCell = cells[descIdx]?.replace(/^"|"$/g, "").replace(/""/g, '"') ?? ""
        expect(descCell).toBe("Check this description exports")
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

        const replaceRes = await api.post(
          "/admin/stock-import",
          {
            csv: replaceCsv,
            options: { auto_create_hops: true, dry_run: false },
          },
          adminAuth
        )
        expect(replaceRes.status).toBe(200)
        expect(replaceRes.data.errors).toEqual([])

        // Look up by ID (not title) to avoid ambiguity if a duplicate was accidentally created
        const [updated] = await productModule.listProducts({ id: product.id })
        expect(updated.metadata.hops).toEqual(["Nelson MT"])
      })
    })
  },
})
