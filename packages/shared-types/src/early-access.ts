/**
 * Early-access ladder, expressed as hours AFTER a product's release time
 * (metadata.release_at). VIP5/VIP4 unlock at release; approved members unlock
 * last, at the public release (release + RELEASE_TO_PUBLIC_HOURS).
 */
export const HOURS_AFTER_RELEASE_BY_TIER = {
  vip5: 0,
  vip4: 0,
  vip3: 12,
  vip2: 18,
  vip1: 21,
  approved: 24,
} as const

export const RELEASE_TO_PUBLIC_HOURS = 24

/** Minutes after upload used when a stock load supplies no release time. */
export const DEFAULT_RELEASE_DELAY_MINUTES = 20

export const RELEASE_TIMEZONE = "Australia/Sydney"

export type Tier = keyof typeof HOURS_AFTER_RELEASE_BY_TIER

/**
 * Same ladder expressed as hours BEFORE public release
 * (early_access_until = release_at + RELEASE_TO_PUBLIC_HOURS).
 */
export const HOURS_BEFORE_PUBLIC_BY_TIER: Record<Tier, number> = {
  vip5: RELEASE_TO_PUBLIC_HOURS - HOURS_AFTER_RELEASE_BY_TIER.vip5,
  vip4: RELEASE_TO_PUBLIC_HOURS - HOURS_AFTER_RELEASE_BY_TIER.vip4,
  vip3: RELEASE_TO_PUBLIC_HOURS - HOURS_AFTER_RELEASE_BY_TIER.vip3,
  vip2: RELEASE_TO_PUBLIC_HOURS - HOURS_AFTER_RELEASE_BY_TIER.vip2,
  vip1: RELEASE_TO_PUBLIC_HOURS - HOURS_AFTER_RELEASE_BY_TIER.vip1,
  approved: RELEASE_TO_PUBLIC_HOURS - HOURS_AFTER_RELEASE_BY_TIER.approved,
}

const TIER_ORDER: Tier[] = ["approved", "vip1", "vip2", "vip3", "vip4", "vip5"]

const HOUR_MS = 60 * 60 * 1000

export function computeTierVisibleFrom(earlyAccessUntil: Date, tier: Tier): Date {
  const hours = HOURS_BEFORE_PUBLIC_BY_TIER[tier]
  return new Date(earlyAccessUntil.getTime() - hours * HOUR_MS)
}

export function canCustomerAccessProduct(
  tier: Tier | null,
  earlyAccessUntil: Date | null,
  now: Date = new Date()
): boolean {
  if (!earlyAccessUntil) return true
  if (now >= earlyAccessUntil) return true
  if (!tier) return false
  const visibleFrom = computeTierVisibleFrom(earlyAccessUntil, tier)
  return now >= visibleFrom
}

export function nextTierForEarlierAccess(
  currentTier: Tier | null,
  earlyAccessUntil: Date | null,
  now: Date = new Date()
): Tier | null {
  if (!earlyAccessUntil) return null
  if (now >= earlyAccessUntil) return null
  const startIdx = currentTier ? TIER_ORDER.indexOf(currentTier) + 1 : 0
  for (let i = startIdx; i < TIER_ORDER.length; i++) {
    const candidate = TIER_ORDER[i]
    if (canCustomerAccessProduct(candidate, earlyAccessUntil, now)) {
      return candidate
    }
  }
  return null
}

/**
 * Lowest tier whose window has opened for a product released at releaseAt,
 * or null if releaseAt is still in the future.
 */
export function currentLowestTierWithAccess(
  releaseAt: Date,
  _offsets: Record<Tier, number> = HOURS_BEFORE_PUBLIC_BY_TIER,
  now: Date = new Date()
): Tier | null {
  if (now < releaseAt) return null
  for (const t of TIER_ORDER) {
    const opensAtMs = releaseAt.getTime() + HOURS_AFTER_RELEASE_BY_TIER[t] * HOUR_MS
    if (now.getTime() >= opensAtMs) return t
  }
  return null
}

export type ProductRelease =
  | { status: "none" }
  | { status: "invalid" }
  | { status: "scheduled"; releaseAt: Date; publicAt: Date }

/**
 * Reads a product's release schedule from metadata. release_at is
 * authoritative; early_access_until (= public release) is a legacy fallback.
 */
export function readProductRelease(
  metadata: Record<string, unknown> | null | undefined
): ProductRelease {
  const rawRelease = metadata?.release_at
  const rawPublic = metadata?.early_access_until
  if (rawRelease) {
    const releaseAt = new Date(String(rawRelease))
    if (isNaN(releaseAt.getTime())) return { status: "invalid" }
    return {
      status: "scheduled",
      releaseAt,
      publicAt: new Date(releaseAt.getTime() + RELEASE_TO_PUBLIC_HOURS * HOUR_MS),
    }
  }
  if (rawPublic) {
    const publicAt = new Date(String(rawPublic))
    if (isNaN(publicAt.getTime())) return { status: "invalid" }
    return {
      status: "scheduled",
      releaseAt: new Date(publicAt.getTime() - RELEASE_TO_PUBLIC_HOURS * HOUR_MS),
      publicAt,
    }
  }
  return { status: "none" }
}

/** When a given tier (null = non-member/anonymous) can buy the product. */
export function tierUnlockAt(releaseAt: Date, tier: Tier | null): Date {
  const hours = tier ? HOURS_AFTER_RELEASE_BY_TIER[tier] : RELEASE_TO_PUBLIC_HOURS
  return new Date(releaseAt.getTime() + hours * HOUR_MS)
}

export type ProductAccess =
  | { locked: false; unlockAt: Date | null }
  | { locked: true; unlockAt: Date | null; reason: "scheduled" | "invalid_release" }

/**
 * Single access decision used by storefront and backend. An unparseable
 * release date locks the product (fails closed).
 */
export function productAccessForTier(
  metadata: Record<string, unknown> | null | undefined,
  tier: Tier | null,
  now: Date = new Date()
): ProductAccess {
  const release = readProductRelease(metadata)
  if (release.status === "none") return { locked: false, unlockAt: null }
  if (release.status === "invalid") {
    return { locked: true, unlockAt: null, reason: "invalid_release" }
  }
  const unlockAt = tierUnlockAt(release.releaseAt, tier)
  if (now >= unlockAt) return { locked: false, unlockAt }
  return { locked: true, unlockAt, reason: "scheduled" }
}

/** Storefront buy-button decision: members only, and only once unlocked. */
export function viewerCanBuy(
  metadata: Record<string, unknown> | null | undefined,
  canSeePricing: boolean,
  tier: Tier | null,
  now: Date = new Date()
): boolean {
  if (!canSeePricing) return false
  return !productAccessForTier(metadata, tier, now).locked
}

const EXPLICIT_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i
const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/

function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  )
  return asUtc - Math.floor(utcMs / 1000) * 1000
}

/**
 * Parses a release time typed by an operator. Values with an explicit offset
 * are taken as-is; offset-less values are wall-clock time in Australia/Sydney.
 * Returns null when the input cannot be parsed.
 */
export function parseReleaseTime(input: string): Date | null {
  const value = input.trim()
  if (!value) return null
  if (EXPLICIT_OFFSET.test(value)) {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  const m = LOCAL_DATETIME.exec(value)
  if (!m) return null
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = m
  const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
  let utc = wall - zoneOffsetMs(wall, RELEASE_TIMEZONE)
  utc = wall - zoneOffsetMs(utc, RELEASE_TIMEZONE)
  const result = new Date(utc)
  return isNaN(result.getTime()) ? null : result
}

/**
 * Release time for a stock load: the supplied value, or now + 20 minutes when
 * none is supplied. Throws on an unparseable value so loads never silently
 * release early.
 */
export function resolveReleaseAt(input: string | null | undefined, now: Date = new Date()): Date {
  if (input == null || String(input).trim() === "") {
    return new Date(now.getTime() + DEFAULT_RELEASE_DELAY_MINUTES * 60 * 1000)
  }
  const parsed = parseReleaseTime(String(input))
  if (!parsed) throw new Error(`invalid release time "${input}"`)
  return parsed
}

/** Metadata patch to write for a release: both keys kept consistent. */
export function releaseMetadata(releaseAt: Date): {
  release_at: string
  early_access_until: string
} {
  return {
    release_at: releaseAt.toISOString(),
    early_access_until: new Date(
      releaseAt.getTime() + RELEASE_TO_PUBLIC_HOURS * HOUR_MS
    ).toISOString(),
  }
}
