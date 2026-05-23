import { decideDemotion } from "../../workflows/steps/apply-vip-demotion"
import { VIP_TIER_THRESHOLDS } from "../../workflows/constants/vip-tiers"

const T = VIP_TIER_THRESHOLDS
const NOW = new Date("2026-05-16T00:00:00Z")
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000)
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86400000)

const base = {
  thresholds: T,
  graceDays: 30,
  now: NOW,
}

describe("decideDemotion", () => {
  it("noop for approved tier (cannot be demoted further)", () => {
    expect(
      decideDemotion({
        ...base,
        currentTier: "approved",
        vipScore: 0,
        pendingDemotion: false,
        demotionWarningAt: null,
      })
    ).toEqual({ action: "noop" })
  })

  it("retained when score still meets threshold", () => {
    expect(
      decideDemotion({
        ...base,
        currentTier: "vip3",
        vipScore: 500,
        pendingDemotion: false,
        demotionWarningAt: null,
      })
    ).toEqual({ action: "retained" })
  })

  it("warning_cleared when score recovers above threshold", () => {
    expect(
      decideDemotion({
        ...base,
        currentTier: "vip3",
        vipScore: 500,
        pendingDemotion: true,
        demotionWarningAt: daysAgo(5),
      })
    ).toEqual({ action: "warning_cleared" })
  })

  it("warning_issued (new) when first dropping below threshold", () => {
    expect(
      decideDemotion({
        ...base,
        currentTier: "vip3",
        vipScore: 449, // below 450 threshold
        pendingDemotion: false,
        demotionWarningAt: null,
      })
    ).toEqual({ action: "warning_issued", isNew: true })
  })

  it("warning_issued (not new) within grace period after prior warning", () => {
    expect(
      decideDemotion({
        ...base,
        currentTier: "vip3",
        vipScore: 100,
        pendingDemotion: true,
        demotionWarningAt: daysAgo(15),
      })
    ).toEqual({ action: "warning_issued", isNew: false })
  })

  it("demoted when warning is older than grace days", () => {
    expect(
      decideDemotion({
        ...base,
        currentTier: "vip3",
        vipScore: 100,
        pendingDemotion: true,
        demotionWarningAt: daysAgo(31),
      })
    ).toEqual({ action: "demoted", from: "vip3", to: "vip2" })
  })

  it("demotes vip5 -> vip4 (one tier down, not all the way)", () => {
    expect(
      decideDemotion({
        ...base,
        currentTier: "vip5",
        vipScore: 0,
        pendingDemotion: true,
        demotionWarningAt: daysAgo(60),
      })
    ).toEqual({ action: "demoted", from: "vip5", to: "vip4" })
  })

  it("demotes vip1 -> approved (the floor)", () => {
    expect(
      decideDemotion({
        ...base,
        currentTier: "vip1",
        vipScore: 0,
        pendingDemotion: true,
        demotionWarningAt: daysAgo(60),
      })
    ).toEqual({ action: "demoted", from: "vip1", to: "approved" })
  })

  it("respects custom graceDays from SiteConfig", () => {
    // 7-day grace: score below threshold + 5 days since warning -> still warning
    expect(
      decideDemotion({
        ...base,
        graceDays: 7,
        currentTier: "vip2",
        vipScore: 100,
        pendingDemotion: true,
        demotionWarningAt: daysAgo(5),
      })
    ).toEqual({ action: "warning_issued", isNew: false })
    // ...but 10 days since warning + 7-day grace -> demoted
    expect(
      decideDemotion({
        ...base,
        graceDays: 7,
        currentTier: "vip2",
        vipScore: 100,
        pendingDemotion: true,
        demotionWarningAt: daysAgo(10),
      })
    ).toEqual({ action: "demoted", from: "vip2", to: "vip1" })
  })

  it("respects custom thresholds from SiteConfig", () => {
    const customThresholds = { vip1: 50, vip2: 150, vip3: 300, vip4: 500, vip5: 800 }
    // vip3 threshold lowered to 300 — score of 350 retains
    expect(
      decideDemotion({
        ...base,
        thresholds: customThresholds as any,
        currentTier: "vip3",
        vipScore: 350,
        pendingDemotion: false,
        demotionWarningAt: null,
      })
    ).toEqual({ action: "retained" })
  })
})
