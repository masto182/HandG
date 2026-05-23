/**
 * Per-tier exclusive window (hours before a product becomes fully public).
 * VIP5/VIP4 get 24h exclusivity (immediate access on activation),
 * stepping down to approved at 1h-before-public.
 */
export const HOURS_BEFORE_PUBLIC_BY_TIER = {
  vip5: 24,
  vip4: 24,
  vip3: 12,
  vip2: 6,
  vip1: 3,
  approved: 1,
} as const

export type Tier = keyof typeof HOURS_BEFORE_PUBLIC_BY_TIER

const HOUR_MS = 60 * 60 * 1000

export function computeTierVisibleFrom(
  earlyAccessUntil: Date,
  tier: Tier
): Date {
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
  const order: Tier[] = ["approved", "vip1", "vip2", "vip3", "vip4", "vip5"]
  const startIdx = currentTier ? order.indexOf(currentTier) + 1 : 0
  for (let i = startIdx; i < order.length; i++) {
    const candidate = order[i]
    if (canCustomerAccessProduct(candidate, earlyAccessUntil, now)) {
      return candidate
    }
  }
  return null
}
