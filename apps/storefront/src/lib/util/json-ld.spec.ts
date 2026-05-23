import { buildProductJsonLd, buildOrganizationJsonLd, buildWebSiteJsonLd } from "./json-ld"

describe("JSON-LD utilities", () => {
  describe("buildProductJsonLd", () => {
    it("includes required Product fields", () => {
      const schema = buildProductJsonLd({
        title: "Pliny the Elder",
        handle: "pliny-the-elder",
        thumbnail: "https://img.example.com/pliny.jpg",
        metadata: { brewery_name: "Russian River" },
        variants: [
          { sku: "PLINY-01", prices: [{ amount: 2500, currency_code: "aud" }], inventory_quantity: 5 },
        ],
      })
      expect(schema["@type"]).toBe("Product")
      expect(schema.name).toBe("Pliny the Elder")
      expect(schema.image).toBe("https://img.example.com/pliny.jpg")
      expect(schema.brand.name).toBe("Russian River")
      expect(schema.sku).toBe("PLINY-01")
    })

    it("builds correct offers with price in dollars", () => {
      const schema = buildProductJsonLd({
        title: "Test",
        handle: "test",
        variants: [
          { prices: [{ amount: 1550, currency_code: "aud" }], inventory_quantity: 3 },
        ],
      })
      expect(schema.offers.price).toBe("15.50")
      expect(schema.offers.priceCurrency).toBe("AUD")
      expect(schema.offers.availability).toBe("https://schema.org/InStock")
    })

    it("marks out-of-stock correctly", () => {
      const schema = buildProductJsonLd({
        title: "Test",
        handle: "test",
        variants: [
          { prices: [{ amount: 1000, currency_code: "aud" }], inventory_quantity: 0 },
        ],
      })
      expect(schema.offers.availability).toBe("https://schema.org/OutOfStock")
    })

    it("handles missing optional fields gracefully", () => {
      const schema = buildProductJsonLd({ title: "Minimal", handle: "min" })
      expect(schema["@type"]).toBe("Product")
      expect(schema.name).toBe("Minimal")
      expect(schema.brand).toBeUndefined()
      expect(schema.offers).toBeUndefined()
      expect(schema.sku).toBeUndefined()
    })
  })

  describe("buildOrganizationJsonLd", () => {
    it("returns valid Organization schema", () => {
      const schema = buildOrganizationJsonLd()
      expect(schema["@type"]).toBe("Organization")
      expect(schema.name).toBe("Hops & Glory")
      expect(schema.url).toContain("example")
    })
  })

  describe("buildWebSiteJsonLd", () => {
    it("returns valid WebSite schema with SearchAction", () => {
      const schema = buildWebSiteJsonLd()
      expect(schema["@type"]).toBe("WebSite")
      expect(schema.potentialAction["@type"]).toBe("SearchAction")
      expect(schema.potentialAction.target.urlTemplate).toContain("store?q=")
    })
  })
})
