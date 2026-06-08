/**
 * Smoke-test helper: sets the VIP tier for a customer to vip5 by creating or
 * updating their vip_score record. Used by scripts/smoke/ci-setup.sh to
 * prepare the VIP5 test customer without going through the full purchase flow.
 *
 * Usage:
 *   SMOKE_VIP5_CUSTOMER_ID=cust_xxx npx medusa exec ./src/scripts/smoke-set-vip-tier.ts
 */
import { MedusaContainer } from "@medusajs/framework/types"
import { VIP_SCORE_MODULE } from "../modules/vip-score"

export default async function smokeSetVipTier(container: MedusaContainer) {
  const logger = container.resolve("logger") as any
  const vipScoreService = container.resolve(VIP_SCORE_MODULE) as any

  const customerId = process.env.SMOKE_VIP5_CUSTOMER_ID
  if (!customerId) {
    logger.error("[smoke-set-vip] SMOKE_VIP5_CUSTOMER_ID env var is required")
    process.exit(1)
  }

  const existing = await vipScoreService.listVipScores({ customer_id: customerId })
  if (existing.length > 0) {
    await vipScoreService.updateVipScores({
      id: existing[0].id,
      current_tier: "vip5",
      total_score: 1200,
    })
    logger.info(`[smoke-set-vip] Updated ${customerId} to vip5`)
  } else {
    await vipScoreService.createVipScores({
      customer_id: customerId,
      current_tier: "vip5",
      total_score: 1200,
      personal_spend_score: 1200,
      direct_referral_score: 0,
      indirect_referral_score: 0,
    })
    logger.info(`[smoke-set-vip] Created vip5 score for ${customerId}`)
  }
}
