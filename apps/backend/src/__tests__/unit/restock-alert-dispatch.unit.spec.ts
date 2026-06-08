import { shouldDispatch, TIER_DISPATCH_OFFSETS } from "../../jobs/restock-alert-dispatch"

const hoursAgo = (h: number, from: number) => new Date(from - h * 60 * 60 * 1000)

describe("restock-alert dispatch ladder", () => {
  const now = new Date()
  const base = now.getTime()

  it("never dispatches before a restock is detected", () => {
    expect(shouldDispatch("vip5", null, now)).toBe(false)
    expect(shouldDispatch("approved", undefined, now)).toBe(false)
  })

  it("dispatches vip5/vip4 immediately on detection (offset 0)", () => {
    expect(shouldDispatch("vip5", now, now)).toBe(true)
    expect(shouldDispatch("vip4", now, now)).toBe(true)
  })

  it("holds lower tiers until their offset elapses", () => {
    // approved = 24h
    expect(shouldDispatch("approved", hoursAgo(23, base), now)).toBe(false)
    expect(shouldDispatch("approved", hoursAgo(24, base), now)).toBe(true)
    // vip3 = 12h
    expect(shouldDispatch("vip3", hoursAgo(11, base), now)).toBe(false)
    expect(shouldDispatch("vip3", hoursAgo(13, base), now)).toBe(true)
    // vip1 = 23h
    expect(shouldDispatch("vip1", hoursAgo(22, base), now)).toBe(false)
    expect(shouldDispatch("vip1", hoursAgo(24, base), now)).toBe(true)
  })

  it("defaults unknown / null tier to the 24h (approved) offset", () => {
    expect(shouldDispatch("nonsense", hoursAgo(23, base), now)).toBe(false)
    expect(shouldDispatch("nonsense", hoursAgo(25, base), now)).toBe(true)
    expect(shouldDispatch(null, hoursAgo(25, base), now)).toBe(true)
  })

  it("encodes the intended tier ordering (higher tier = sooner)", () => {
    expect(TIER_DISPATCH_OFFSETS.vip5).toBeLessThanOrEqual(TIER_DISPATCH_OFFSETS.vip3)
    expect(TIER_DISPATCH_OFFSETS.vip3).toBeLessThanOrEqual(TIER_DISPATCH_OFFSETS.vip1)
    expect(TIER_DISPATCH_OFFSETS.vip1).toBeLessThanOrEqual(TIER_DISPATCH_OFFSETS.approved)
  })
})
