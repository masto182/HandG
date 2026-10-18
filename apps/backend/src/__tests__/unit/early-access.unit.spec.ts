import {
  HOURS_AFTER_RELEASE_BY_TIER,
  HOURS_BEFORE_PUBLIC_BY_TIER,
  canCustomerAccessProduct,
  nextTierForEarlierAccess,
  currentLowestTierWithAccess,
  readProductRelease,
  tierUnlockAt,
  productAccessForTier,
  parseReleaseTime,
  resolveReleaseAt,
  releaseMetadata,
  type Tier,
} from "@retail-example/shared-types"

const HOUR = 60 * 60 * 1000

describe("early-access ladder", () => {
  const release = new Date("2026-06-01T08:00:00.000Z")
  const meta = releaseMetadata(release)

  it("matches the business spec: hours after release", () => {
    expect(HOURS_AFTER_RELEASE_BY_TIER).toEqual({
      vip5: 0,
      vip4: 0,
      vip3: 12,
      vip2: 18,
      vip1: 21,
      approved: 24,
    })
    expect(HOURS_BEFORE_PUBLIC_BY_TIER.approved).toBe(0)
  })

  it("releaseMetadata keeps public release 24h after release", () => {
    expect(meta.release_at).toBe(release.toISOString())
    expect(meta.early_access_until).toBe(new Date(release.getTime() + 24 * HOUR).toISOString())
  })

  const cases: Array<[Tier | null, number]> = [
    ["vip5", 0],
    ["vip4", 0],
    ["vip3", 12],
    ["vip2", 18],
    ["vip1", 21],
    ["approved", 24],
    [null, 24],
  ]

  it.each(cases)("%s unlocks at release + %ih and not a millisecond before", (tier, hours) => {
    const unlock = new Date(release.getTime() + hours * HOUR)
    expect(tierUnlockAt(release, tier).toISOString()).toBe(unlock.toISOString())

    expect(productAccessForTier(meta, tier, unlock).locked).toBe(false)
    const before = productAccessForTier(meta, tier, new Date(unlock.getTime() - 1))
    expect(before.locked).toBe(true)
    expect(before.unlockAt?.toISOString()).toBe(unlock.toISOString())

    const publicAt = new Date(meta.early_access_until)
    expect(canCustomerAccessProduct(tier, publicAt, unlock)).toBe(true)
    expect(canCustomerAccessProduct(tier, publicAt, new Date(unlock.getTime() - 1))).toBe(false)
  })

  it("legacy early_access_until-only metadata is read as public release", () => {
    const r = readProductRelease({ early_access_until: meta.early_access_until })
    expect(r.status).toBe("scheduled")
    if (r.status === "scheduled") {
      expect(r.releaseAt.toISOString()).toBe(release.toISOString())
    }
  })

  it("no release metadata -> unlocked for everyone", () => {
    expect(productAccessForTier({}, null).locked).toBe(false)
    expect(productAccessForTier(null, "approved").locked).toBe(false)
  })

  it("unparseable release -> locked for everyone (fails closed)", () => {
    const a = productAccessForTier({ release_at: "not a date" }, "vip5")
    expect(a.locked).toBe(true)
    expect(a.unlockAt).toBeNull()
  })

  it("nextTierForEarlierAccess suggests the next tier already unlocked", () => {
    const publicAt = new Date(meta.early_access_until)
    const now = new Date(release.getTime() + 20 * HOUR)
    expect(nextTierForEarlierAccess("approved", publicAt, now)).toBe("vip2")
    expect(nextTierForEarlierAccess("vip5", publicAt, now)).toBeNull()
  })

  it("currentLowestTierWithAccess walks the ladder", () => {
    expect(
      currentLowestTierWithAccess(release, undefined, new Date(release.getTime() - 1))
    ).toBeNull()
    expect(currentLowestTierWithAccess(release, undefined, release)).toBe("vip4")
    expect(
      currentLowestTierWithAccess(release, undefined, new Date(release.getTime() + 18 * HOUR))
    ).toBe("vip2")
    expect(
      currentLowestTierWithAccess(release, undefined, new Date(release.getTime() + 24 * HOUR))
    ).toBe("approved")
  })
})

describe("release time parsing", () => {
  it("offset-less times are Sydney wall clock (AEST and AEDT)", () => {
    expect(parseReleaseTime("2026-06-01T18:00")?.toISOString()).toBe("2026-06-01T08:00:00.000Z")
    expect(parseReleaseTime("2026-10-20 18:00")?.toISOString()).toBe("2026-10-20T07:00:00.000Z")
  })

  it("explicit offsets are honoured", () => {
    expect(parseReleaseTime("2026-06-01T18:00:00+10:00")?.toISOString()).toBe(
      "2026-06-01T08:00:00.000Z"
    )
    expect(parseReleaseTime("2026-06-01T08:00:00Z")?.toISOString()).toBe("2026-06-01T08:00:00.000Z")
  })

  it("garbage -> null", () => {
    expect(parseReleaseTime("next tuesday")).toBeNull()
  })

  it("resolveReleaseAt defaults to upload + 20 minutes", () => {
    const now = new Date("2026-06-01T00:00:00Z")
    expect(resolveReleaseAt(undefined, now).toISOString()).toBe("2026-06-01T00:20:00.000Z")
    expect(resolveReleaseAt("  ", now).toISOString()).toBe("2026-06-01T00:20:00.000Z")
  })

  it("resolveReleaseAt throws on an unparseable value", () => {
    expect(() => resolveReleaseAt("soon")).toThrow(/invalid release time/)
  })
})
