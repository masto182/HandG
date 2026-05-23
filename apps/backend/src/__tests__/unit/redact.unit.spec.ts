import {
  redactDescription,
  redactProductMetadata,
  redactProductForPublic,
} from "../../lib/access/redact"

describe("redact", () => {
  describe("redactDescription", () => {
    it("strips ABV markers", () => {
      expect(redactDescription("Hazy IPA — 6.5% ABV. Stone fruit notes.")).toBe(
        "Hazy IPA. Stone fruit notes."
      )
    })

    it("strips Untappd score parentheticals", () => {
      expect(redactDescription("Big stout (Untappd: 4.2)")).toBe("Big stout")
    })

    it("handles multiple ABV patterns", () => {
      expect(redactDescription("A 7.2% ABV triple and a 3.5% ABV lager")).toBe(
        "A triple and a lager"
      )
    })

    it("collapses whitespace and dash-dot filler", () => {
      const out = redactDescription("Name — 6.5% ABV. Lovely.")
      expect(out).not.toMatch(/ {2,}/)
      expect(out).toBe("Name. Lovely.")
    })

    it("null/empty -> empty string", () => {
      expect(redactDescription(null)).toBe("")
      expect(redactDescription(undefined)).toBe("")
      expect(redactDescription("")).toBe("")
    })
  })

  describe("redactProductMetadata", () => {
    it("removes abv, untappd_score, untappd_rating", () => {
      const out = redactProductMetadata({
        abv: "6.5",
        untappd_score: 4.2,
        untappd_rating: 4.2,
        brewery: "Hop & Glory",
        style: "NEIPA",
      })
      expect(out).toEqual({ brewery: "Hop & Glory", style: "NEIPA" })
    })

    it("null input -> null", () => {
      expect(redactProductMetadata(null)).toBeNull()
      expect(redactProductMetadata(undefined)).toBeNull()
    })

    it("no sensitive keys -> returns clone with same keys", () => {
      expect(redactProductMetadata({ brewery: "X" })).toEqual({ brewery: "X" })
    })
  })

  describe("redactProductForPublic", () => {
    const input = {
      id: "prod_1",
      title: "Hazy",
      description: "NEIPA — 7.2% ABV. (Untappd: 4.3)",
      metadata: { abv: "7.2", untappd_score: 4.3, brewery: "X" },
      variants: [
        {
          id: "v1",
          sku: "HG-001",
          prices: [{ amount: 1500 }],
          calculated_price: { amount: 1500 },
          inventory_quantity: 50,
        },
      ],
    }

    it("strips pricing from every variant", () => {
      const out = redactProductForPublic(input)
      expect(out.variants?.[0].prices).toBeUndefined()
      expect(out.variants?.[0].calculated_price).toBeUndefined()
      expect(out.variants?.[0].sku).toBe("HG-001")
      expect(out.variants?.[0].inventory_quantity).toBe(50)
    })

    it("redacts description and metadata", () => {
      const out = redactProductForPublic(input)
      expect(out.description).toBe("NEIPA.")
      expect(out.metadata).toEqual({ brewery: "X" })
    })

    it("does not mutate the input object", () => {
      const before = JSON.parse(JSON.stringify(input))
      redactProductForPublic(input)
      expect(input).toEqual(before)
    })
  })
})
