import {
  parseStockImportCsv,
  slugify,
  splitMulti,
  parseBoolean,
} from "../../api/admin/stock-import/parser"

describe("stock-import parser", () => {
  describe("slugify", () => {
    it("lowercases and dashes", () => {
      expect(slugify("Hop Nation")).toBe("hop-nation")
    })
    it("collapses non-alnum runs and trims", () => {
      expect(slugify("  Range / Brewing!  ")).toBe("range-brewing")
    })
  })

  describe("splitMulti", () => {
    it("returns [] for empty", () => {
      expect(splitMulti("")).toEqual([])
    })
    it("splits comma list and trims", () => {
      expect(splitMulti(" Citra, Mosaic , Galaxy ")).toEqual(["Citra", "Mosaic", "Galaxy"])
    })
    it("drops empty entries", () => {
      expect(splitMulti("Citra,,Mosaic,")).toEqual(["Citra", "Mosaic"])
    })
  })

  describe("parseBoolean", () => {
    it("accepts truthy variants", () => {
      expect(parseBoolean("true")).toBe(true)
      expect(parseBoolean("1")).toBe(true)
      expect(parseBoolean("yes")).toBe(true)
      expect(parseBoolean("Y")).toBe(true)
    })
    it("accepts falsy variants", () => {
      expect(parseBoolean("false")).toBe(false)
      expect(parseBoolean("0")).toBe(false)
      expect(parseBoolean("no")).toBe(false)
    })
    it("returns undefined for empty/unknown", () => {
      expect(parseBoolean("")).toBeUndefined()
      expect(parseBoolean(undefined)).toBeUndefined()
      expect(parseBoolean("maybe")).toBeUndefined()
    })
  })

  describe("parseStockImportCsv", () => {
    it("parses a minimal row", () => {
      const csv = "name,brewery,style,abv,price,stock\nStatus Quo,Mountain Culture,DIPA,8.0,15,24\n"
      const rows = parseStockImportCsv(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].name).toBe("Status Quo")
      expect(rows[0].brewery).toBe("Mountain Culture")
      expect(rows[0].collab_breweries).toEqual([])
      expect(rows[0].hops).toEqual([])
      expect(rows[0].images).toEqual([])
      expect(rows[0].release_at).toBeUndefined()
      expect(rows[0].is_anniversary).toBeUndefined()
    })

    it("handles a quoted comma in a single-value field", () => {
      const csv = 'name,brewery,style,abv,price,stock\n"Beer, with a comma",Range,IPA,6.5,12,10\n'
      const rows = parseStockImportCsv(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].name).toBe("Beer, with a comma")
      expect(rows[0].brewery).toBe("Range")
    })

    it("parses multi-value collab_breweries and hops in quoted cells", () => {
      const csv =
        "name,brewery,collab_breweries,hops,style,abv,price,stock\n" +
        'Joint Effort,Range,"Hop Nation,Mountain Culture","Citra,Mosaic,Galaxy",DDH IPA,7,18,12\n'
      const rows = parseStockImportCsv(csv)
      expect(rows[0].collab_breweries).toEqual(["Hop Nation", "Mountain Culture"])
      expect(rows[0].hops).toEqual(["Citra", "Mosaic", "Galaxy"])
    })

    it("parses release_at and is_anniversary", () => {
      const csv =
        "name,brewery,style,abv,price,stock,release_at,is_anniversary\n" +
        "Birthday Brew,Stomping Ground,Stout,9,20,6,2026-06-01T18:00:00+10:00,yes\n"
      const rows = parseStockImportCsv(csv)
      expect(rows[0].release_at).toBe("2026-06-01T18:00:00+10:00")
      expect(rows[0].is_anniversary).toBe(true)
    })

    it("parses volume_ml when present", () => {
      const csv = "name,brewery,style,abv,price,stock,volume_ml\nBeer,Co,IPA,6,10,5,440\n"
      const rows = parseStockImportCsv(csv)
      expect(rows[0].volume_ml).toBe("440")
    })

    it("leaves volume_ml undefined when not provided", () => {
      const csv = "name,brewery,style,abv,price,stock\nBeer,Co,IPA,6,10,5\n"
      const rows = parseStockImportCsv(csv)
      expect(rows[0].volume_ml).toBeUndefined()
    })

    it("preserves unknown columns into extras", () => {
      const csv = "name,brewery,style,abv,price,stock,fictional_field\n" + "X,Y,IPA,6,10,5,hello\n"
      const rows = parseStockImportCsv(csv)
      expect(rows[0].extras).toEqual({ fictional_field: "hello" })
    })

    it("skips rows missing name or brewery", () => {
      const csv =
        "name,brewery,style,abv,price,stock\n" +
        ",Range,IPA,6,10,5\n" +
        "Beer,,IPA,6,10,5\n" +
        "Real,Range,IPA,6,10,5\n"
      const rows = parseStockImportCsv(csv)
      expect(rows).toHaveLength(1)
      expect(rows[0].name).toBe("Real")
    })

    it("normalises header case", () => {
      const csv = "Name,Brewery,Style,ABV,Price,Stock\nA,B,IPA,6,10,5\n"
      const rows = parseStockImportCsv(csv)
      expect(rows[0].name).toBe("A")
    })
  })
})
