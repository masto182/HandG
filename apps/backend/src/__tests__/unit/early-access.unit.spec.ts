import {
  HOURS_BEFORE_PUBLIC_BY_TIER,
  computeTierVisibleFrom,
  canCustomerAccessProduct,
  nextTierForEarlierAccess,
} from "@retail-example/shared-types"

const HOUR = 60 * 60 * 1000

describe("early-access", () => {
  const eaUntil = new Date("2026-06-01T12:00:00.000Z")

  describe("computeTierVisibleFrom", () => {
    it("VIP5 gets 24h head start (immediate on activation)", () => {
      expect(computeTierVisibleFrom(eaUntil, "vip5").toISOString()).toBe(
        new Date(eaUntil.getTime() - 24 * HOUR).toISOString()
      )
    })

    it("VIP4 matches VIP5 (both at T-24h)", () => {
      expect(computeTierVisibleFrom(eaUntil, "vip4").toISOString()).toBe(
        computeTierVisibleFrom(eaUntil, "vip5").toISOString()
      )
    })

    it("VIP3 = T-12h", () => {
      expect(computeTierVisibleFrom(eaUntil, "vip3").toISOString()).toBe(
        new Date(eaUntil.getTime() - 12 * HOUR).toISOString()
      )
    })

    it("VIP2 = T-6h, VIP1 = T-3h, approved = T-1h", () => {
      expect(computeTierVisibleFrom(eaUntil, "vip2").toISOString()).toBe(
        new Date(eaUntil.getTime() - 6 * HOUR).toISOString()
      )
      expect(computeTierVisibleFrom(eaUntil, "vip1").toISOString()).toBe(
        new Date(eaUntil.getTime() - 3 * HOUR).toISOString()
      )
      expect(computeTierVisibleFrom(eaUntil, "approved").toISOString()).toBe(
        new Date(eaUntil.getTime() - 1 * HOUR).toISOString()
      )
    })
  })

  describe("canCustomerAccessProduct", () => {
    it("null earlyAccessUntil -> everyone has access (including anonymous)", () => {
      expect(canCustomerAccessProduct(null, null)).toBe(true)
      expect(canCustomerAccessProduct("approved", null)).toBe(true)
      expect(canCustomerAccessProduct("vip5", null)).toBe(true)
    })

    it("now >= earlyAccessUntil -> public access, tier irrelevant", () => {
      const now = new Date(eaUntil.getTime() + 1000)
      expect(canCustomerAccessProduct(null, eaUntil, now)).toBe(true)
      expect(canCustomerAccessProduct("approved", eaUntil, now)).toBe(true)
    })

    it("anonymous before public time -> false", () => {
      const now = new Date(eaUntil.getTime() - 2 * HOUR)
      expect(canCustomerAccessProduct(null, eaUntil, now)).toBe(false)
    })

    it("VIP3 at T-10h (inside their 12h window) -> true", () => {
      const now = new Date(eaUntil.getTime() - 10 * HOUR)
      expect(canCustomerAccessProduct("vip3", eaUntil, now)).toBe(true)
    })

    it("approved at T-2h (outside their 1h window) -> false", () => {
      const now = new Date(eaUntil.getTime() - 2 * HOUR)
      expect(canCustomerAccessProduct("approved", eaUntil, now)).toBe(false)
    })

    it("approved at exactly T-1h boundary -> true", () => {
      const now = new Date(eaUntil.getTime() - 1 * HOUR)
      expect(canCustomerAccessProduct("approved", eaUntil, now)).toBe(true)
    })
  })

  describe("nextTierForEarlierAccess", () => {
    it("null earlyAccessUntil -> null (no upgrade needed)", () => {
      expect(nextTierForEarlierAccess("approved", null)).toBeNull()
    })

    it("after public time -> null (everyone has access)", () => {
      const now = new Date(eaUntil.getTime() + 1000)
      expect(nextTierForEarlierAccess("approved", eaUntil, now)).toBeNull()
    })

    it("anonymous at T-2h -> suggests approved (whose window starts at T-1h)", () => {
      const now = new Date(eaUntil.getTime() - 0.5 * HOUR)
      // Still within approved's 1h window, so approved would have access.
      expect(nextTierForEarlierAccess(null, eaUntil, now)).toBe("approved")
    })

    it("approved at T-2h -> suggests vip1 (whose window starts at T-3h)", () => {
      const now = new Date(eaUntil.getTime() - 2 * HOUR)
      expect(nextTierForEarlierAccess("approved", eaUntil, now)).toBe("vip1")
    })

    it("vip3 at T-20h -> suggests vip4 (window starts at T-24h)", () => {
      const now = new Date(eaUntil.getTime() - 20 * HOUR)
      expect(nextTierForEarlierAccess("vip3", eaUntil, now)).toBe("vip4")
    })

    it("vip5 already has access -> null", () => {
      const now = new Date(eaUntil.getTime() - 20 * HOUR)
      expect(nextTierForEarlierAccess("vip5", eaUntil, now)).toBeNull()
    })
  })

  describe("HOURS_BEFORE_PUBLIC_BY_TIER constants", () => {
    it("matches the business spec exactly", () => {
      expect(HOURS_BEFORE_PUBLIC_BY_TIER).toEqual({
        vip5: 24,
        vip4: 24,
        vip3: 12,
        vip2: 6,
        vip1: 3,
        approved: 1,
      })
    })
  })
})
