import {
  VIP_TIER_THRESHOLDS,
  VIP_TIERS_ORDERED,
  VIP_DIRECT_MULTIPLIER,
  VIP_INDIRECT_MULTIPLIER,
  VIP_ROLLING_WINDOW_MONTHS,
  getHighestEligibleTier,
  getTierIndex,
} from "@retail-example/shared-types"

describe("vip-tiers constants and helpers", () => {
  describe("threshold values match the confirmed spec", () => {
    it("VIP1=100, VIP2=250, VIP3=450, VIP4=700, VIP5=1000", () => {
      expect(VIP_TIER_THRESHOLDS).toEqual({
        vip1: 100,
        vip2: 250,
        vip3: 450,
        vip4: 700,
        vip5: 1000,
      })
    })

    it("formula constants are correct (0.2 direct, 0.1 indirect, 3-month window)", () => {
      expect(VIP_DIRECT_MULTIPLIER).toBe(0.2)
      expect(VIP_INDIRECT_MULTIPLIER).toBe(0.1)
      expect(VIP_ROLLING_WINDOW_MONTHS).toBe(3)
    })

    it("tier order has approved at idx 0, vip5 at idx 5", () => {
      expect(VIP_TIERS_ORDERED[0]).toBe("approved")
      expect(VIP_TIERS_ORDERED[5]).toBe("vip5")
      expect(getTierIndex("approved")).toBe(0)
      expect(getTierIndex("vip5")).toBe(5)
    })
  })

  describe("getHighestEligibleTier (score-only)", () => {
    const cases: Array<[number, string]> = [
      [0, "approved"],
      [99, "approved"],
      [100, "vip1"],
      [249, "vip1"],
      [250, "vip2"],
      [449, "vip2"],
      [450, "vip3"],
      [699, "vip3"],
      [700, "vip4"],
      [999, "vip4"],
      [1000, "vip5"],
      [10000, "vip5"],
    ]

    it.each(cases)("score %d -> %s", (score, expected) => {
      expect(getHighestEligibleTier(score)).toBe(expected)
    })
  })
})
