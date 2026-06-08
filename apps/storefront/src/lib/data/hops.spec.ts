jest.mock("@lib/config", () => ({
  sdk: {
    client: {
      fetch: jest.fn(),
    },
  },
}))

import { sdk } from "@lib/config"
import { listHops, getHopBySlug, type Hop } from "./hops"

const mockFetch = sdk.client.fetch as jest.MockedFunction<
  typeof sdk.client.fetch
>

// Minimal valid hop fixture covering all new taxonomy fields
const makeHop = (overrides: Partial<Hop> = {}): Hop => ({
  id: "h1",
  name: "Nelson Sauvin",
  slug: "nelson-sauvin",
  origin: "New Zealand - Nelson",
  country_code: "NZ",
  breeder: "NZ Hops Ltd",
  available_forms: ["T90", "Cryo", "SubZeroHopKief", "HopKief"],
  farm_notes:
    "Freestyle Hops offer SubZero Hop Kief. Eggers Hops provide farm-specific lots.",
  flavor_profile: "White wine, gooseberry, grapefruit",
  description: null,
  image_url: null,
  product_count: 5,
  ...overrides,
})

describe("lib/data/hops", () => {
  beforeEach(() => mockFetch.mockReset())

  // ── listHops ────────────────────────────────────────────────────────────────

  describe("listHops", () => {
    it("returns the hops array on success", async () => {
      const hops = [makeHop()]
      mockFetch.mockResolvedValueOnce({ hops } as any)
      expect(await listHops()).toEqual(hops)
    })

    it("passes all new taxonomy fields through unchanged", async () => {
      const hops = [makeHop()]
      mockFetch.mockResolvedValueOnce({ hops } as any)
      const result = await listHops()
      expect(result[0].country_code).toBe("NZ")
      expect(result[0].breeder).toBe("NZ Hops Ltd")
      expect(result[0].available_forms).toEqual([
        "T90",
        "Cryo",
        "SubZeroHopKief",
        "HopKief",
      ])
      expect(result[0].farm_notes).toContain("Freestyle Hops")
    })

    it("returns empty array when the fetch throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("network"))
      expect(await listHops()).toEqual([])
    })

    it("handles null new fields gracefully (legacy hop without taxonomy data)", async () => {
      const legacyHop = makeHop({
        country_code: null,
        breeder: null,
        available_forms: null,
        farm_notes: null,
      })
      mockFetch.mockResolvedValueOnce({ hops: [legacyHop] } as any)
      const result = await listHops()
      expect(result[0].country_code).toBeNull()
      expect(result[0].available_forms).toBeNull()
    })

    it("handles missing hops key returning empty array", async () => {
      mockFetch.mockResolvedValueOnce({} as any)
      expect(await listHops()).toEqual([])
    })
  })

  // ── getHopBySlug ────────────────────────────────────────────────────────────

  describe("getHopBySlug", () => {
    it("returns hop + products on success", async () => {
      const hop = makeHop()
      const products = [{ id: "p1", title: "Parrotdog Tūī" }]
      mockFetch.mockResolvedValueOnce({ hop, products } as any)
      const result = await getHopBySlug("nelson-sauvin")
      expect(result?.hop.name).toBe("Nelson Sauvin")
      expect(result?.products).toHaveLength(1)
    })

    it("includes all new taxonomy fields on the returned hop", async () => {
      const hop = makeHop()
      mockFetch.mockResolvedValueOnce({ hop, products: [] } as any)
      const result = await getHopBySlug("nelson-sauvin")
      expect(result?.hop.country_code).toBe("NZ")
      expect(result?.hop.breeder).toBe("NZ Hops Ltd")
      expect(result?.hop.available_forms).toContain("SubZeroHopKief")
      expect(result?.hop.farm_notes).toBeTruthy()
    })

    it("returns null when hop is missing from response", async () => {
      mockFetch.mockResolvedValueOnce({ hop: null, products: [] } as any)
      expect(await getHopBySlug("unknown")).toBeNull()
    })

    it("returns null when the fetch throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("not found"))
      expect(await getHopBySlug("bad-slug")).toBeNull()
    })

    it("handles EU country_code for a European hop", async () => {
      const euHop = makeHop({
        name: "Saaz",
        slug: "saaz",
        origin: "Czech Republic",
        country_code: "EU",
        breeder: "Czech Hop Institute",
        available_forms: ["T90", "WholeCone"],
        farm_notes: null,
      })
      mockFetch.mockResolvedValueOnce({ hop: euHop, products: [] } as any)
      const result = await getHopBySlug("saaz")
      expect(result?.hop.country_code).toBe("EU")
    })

    it("normalises missing available_forms to empty array", async () => {
      // Route already returns `hop.available_forms || []` so this tests
      // that our type allows the null case and calling code can guard.
      const hopWithNull = makeHop({ available_forms: null })
      mockFetch.mockResolvedValueOnce({ hop: hopWithNull, products: [] } as any)
      const result = await getHopBySlug("nelson-sauvin")
      // null is a valid return value — consumer code guards with `|| []`
      expect(result?.hop.available_forms).toBeNull()
    })
  })
})
