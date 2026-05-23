/**
 * VIP scoring formula (3-month rolling window, captured orders only):
 *   score = personal_spend
 *         + VIP_DIRECT_MULTIPLIER   * direct_referral_spend
 *         + VIP_INDIRECT_MULTIPLIER * indirect_referral_spend  (2 hops, no double count)
 *
 * Tier is the highest tier whose threshold the score meets.
 */
export const VIP_TIER_THRESHOLDS = {
  vip1: 100,
  vip2: 250,
  vip3: 450,
  vip4: 700,
  vip5: 1000,
} as const

export const VIP_TIERS_ORDERED = [
  "approved",
  "vip1",
  "vip2",
  "vip3",
  "vip4",
  "vip5",
] as const

export type VipTier = (typeof VIP_TIERS_ORDERED)[number]

export const VIP_ROLLING_WINDOW_MONTHS = 3
export const VIP_DIRECT_MULTIPLIER = 0.2
export const VIP_INDIRECT_MULTIPLIER = 0.1
export const VIP_DEMOTION_GRACE_DAYS = 30

export function getTierIndex(tier: string): number {
  return VIP_TIERS_ORDERED.indexOf(tier as VipTier)
}

export function getHighestEligibleTier(vipScore: number): VipTier {
  let highest: VipTier = "approved"
  for (const tier of ["vip1", "vip2", "vip3", "vip4", "vip5"] as const) {
    if (vipScore >= VIP_TIER_THRESHOLDS[tier]) {
      highest = tier
    }
  }
  return highest
}
