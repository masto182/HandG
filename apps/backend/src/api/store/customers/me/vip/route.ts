import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  VIP_TIER_THRESHOLDS,
  VIP_TIERS_ORDERED,
  VIP_DEMOTION_GRACE_DAYS,
} from "../../../../../workflows/constants/vip-tiers"
import { VIP_SCORE_MODULE } from "../../../../../modules/vip-score"
import { REFERRAL_MODULE } from "../../../../../modules/referral"
import { SITE_CONFIG_MODULE } from "../../../../../modules/site-config"
import type SiteConfigModuleService from "../../../../../modules/site-config/service"

type VipEarlyAccessOffsets = {
  vip1: number
  vip2: number
  vip3: number
  vip4: number
  vip5: number
}

// Visibility offsets used by storefront countdown / listing logic. Same
// site-config key as VipEarlyAccessOffsets above (extra `approved` key); the
// storefront uses these to compute per-tier purchase windows. Defaults match
// HOURS_BEFORE_PUBLIC_BY_TIER in @retail-example/shared-types.
type EarlyAccessVisibilityOffsets = {
  approved: number
  vip1: number
  vip2: number
  vip3: number
  vip4: number
  vip5: number
}

const DEFAULT_VISIBILITY_OFFSETS: EarlyAccessVisibilityOffsets = {
  approved: 1,
  vip1: 3,
  vip2: 6,
  vip3: 12,
  vip4: 24,
  vip5: 24,
}

const DEFAULT_OFFSETS: VipEarlyAccessOffsets = {
  vip1: 0,
  vip2: 6,
  vip3: 12,
  vip4: 24,
  vip5: 48,
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
  const referralService = req.scope.resolve(REFERRAL_MODULE) as any
  const customerModule = req.scope.resolve("customer") as any

  // Resolve dynamic config once per request (DB > env > default).
  let graceDays = VIP_DEMOTION_GRACE_DAYS
  let offsets: VipEarlyAccessOffsets = DEFAULT_OFFSETS
  let visibilityOffsets: EarlyAccessVisibilityOffsets = DEFAULT_VISIBILITY_OFFSETS
  try {
    const siteConfig = req.scope.resolve(SITE_CONFIG_MODULE) as SiteConfigModuleService
    const [g, o] = await Promise.all([
      siteConfig.get<number>("vip_demotion_grace_days"),
      siteConfig.get<Partial<EarlyAccessVisibilityOffsets>>("vip_early_access_offsets_hours"),
    ])
    if (typeof g === "number") graceDays = g
    if (o && typeof o === "object") {
      offsets = { ...DEFAULT_OFFSETS, ...(o as Partial<VipEarlyAccessOffsets>) }
      visibilityOffsets = { ...DEFAULT_VISIBILITY_OFFSETS, ...o }
    }
  } catch {}

  const [scoreRecord] = await vipScoreService.listVipScores({
    customer_id: customerId,
  })

  if (!scoreRecord) {
    return res.json({
      tier: "approved",
      score: {
        personal_spend: 0,
        direct_referral_spend: 0,
        indirect_referral_spend: 0,
        total: 0,
      },
      orders_window: 0,
      next_tier: getNextTierInfo("approved", 0, offsets),
      demotion_grace_days: graceDays,
      referral_code: null,
      network_stats: { members_referred: 0, network_contribution: 0 },
      pending_demotion: false,
      tier_achieved_at: null,
      demotion_warning_at: null,
      early_access_offsets: visibilityOffsets,
    })
  }

  const [customer] = await customerModule.listCustomers({ id: customerId })
  const referralCode = (customer?.metadata as any)?.referral_code || null

  const referrals = await referralService.listReferrals({
    referrer_customer_id: customerId,
  })

  res.json({
    tier: scoreRecord.current_tier,
    score: {
      personal_spend: scoreRecord.personal_spend_12mo,
      direct_referral_spend: scoreRecord.direct_spend_12mo ?? 0,
      indirect_referral_spend: scoreRecord.indirect_spend_12mo ?? 0,
      total: scoreRecord.vip_score,
    },
    orders_window: scoreRecord.order_count_12mo,
    next_tier: getNextTierInfo(scoreRecord.current_tier, scoreRecord.vip_score, offsets),
    demotion_grace_days: graceDays,
    referral_code: referralCode,
    network_stats: {
      members_referred: referrals.length,
      network_contribution: scoreRecord.network_spend_12mo,
    },
    pending_demotion: scoreRecord.pending_demotion,
    tier_achieved_at: scoreRecord.tier_achieved_at,
    demotion_warning_at: scoreRecord.demotion_warning_at,
    early_access_offsets: visibilityOffsets,
  })
}

function getNextTierInfo(
  currentTier: string,
  currentScore: number,
  offsets: VipEarlyAccessOffsets
) {
  const currentIdx = VIP_TIERS_ORDERED.indexOf(currentTier as any)
  if (currentIdx >= VIP_TIERS_ORDERED.length - 1) {
    return null
  }

  const nextTier = VIP_TIERS_ORDERED[currentIdx + 1]
  const threshold = VIP_TIER_THRESHOLDS[nextTier as keyof typeof VIP_TIER_THRESHOLDS]
  if (threshold === undefined) return null

  return {
    tier: nextTier,
    requirements: { score: threshold },
    progress: { score_needed: Math.max(0, threshold - currentScore) },
    perk_offset_hours: offsets[nextTier as keyof VipEarlyAccessOffsets] ?? 0,
  }
}
