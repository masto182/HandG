import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import {
  VIP_TIER_THRESHOLDS,
  VIP_DEMOTION_GRACE_DAYS,
  VIP_TIERS_ORDERED,
  getTierIndex,
  type VipTier,
} from "../constants/vip-tiers"
import { VIP_SCORE_MODULE } from "../../modules/vip-score"
import { SITE_CONFIG_MODULE } from "../../modules/site-config"

async function resolveVipDemotionConfig(container: any): Promise<{
  thresholds: typeof VIP_TIER_THRESHOLDS
  graceDays: number
}> {
  try {
    const svc = container.resolve(SITE_CONFIG_MODULE) as any
    const [t, g] = await Promise.all([
      svc.get("vip_thresholds"),
      svc.get("vip_demotion_grace_days"),
    ])
    return {
      thresholds: (t && typeof t === "object" ? t : VIP_TIER_THRESHOLDS) as typeof VIP_TIER_THRESHOLDS,
      graceDays: typeof g === "number" ? g : VIP_DEMOTION_GRACE_DAYS,
    }
  } catch {
    return { thresholds: VIP_TIER_THRESHOLDS, graceDays: VIP_DEMOTION_GRACE_DAYS }
  }
}

type ApplyVipDemotionInput = {
  customer_id: string
  vip_score: number
}

type ApplyVipDemotionOutput = {
  action: "retained" | "warning_issued" | "warning_cleared" | "demoted" | "noop"
  from_tier?: string
  to_tier?: string
  /** Only set when action === "warning_issued"; true if a fresh warning was just stamped. */
  is_new_warning?: boolean
  /** Only set when action === "warning_issued"; days left in the grace period. */
  days_remaining?: number
}

function stepDownTier(current: string): string {
  const idx = getTierIndex(current)
  if (idx <= 1) return "approved"
  return VIP_TIERS_ORDERED[idx - 1]
}

/**
 * Pure decision function — extracted for unit testing.
 *
 * Action semantics:
 *  - 'noop': not subject to demotion (already at floor or unknown tier)
 *  - 'retained': score still meets threshold; if pending warning, clear it
 *  - 'warning_cleared': previously warned but now meets threshold
 *  - 'warning_issued': falls below threshold; either issue new warning or stay in grace
 *  - 'demoted': warning + grace expired
 */
export type DemotionDecision =
  | { action: "noop" }
  | { action: "retained" }
  | { action: "warning_cleared" }
  | { action: "warning_issued"; isNew: boolean }
  | { action: "demoted"; from: string; to: string }

export function decideDemotion(args: {
  currentTier: string
  vipScore: number
  pendingDemotion: boolean
  demotionWarningAt: Date | null
  thresholds: typeof VIP_TIER_THRESHOLDS
  graceDays: number
  now: Date
}): DemotionDecision {
  const { currentTier, vipScore, pendingDemotion, demotionWarningAt, thresholds, graceDays, now } = args

  if (currentTier === "approved" || !(currentTier in thresholds)) {
    return { action: "noop" }
  }

  const retainThreshold = thresholds[currentTier as keyof typeof thresholds]
  const meetsCriteria = vipScore >= retainThreshold

  if (meetsCriteria) {
    if (pendingDemotion) return { action: "warning_cleared" }
    return { action: "retained" }
  }

  if (!pendingDemotion) {
    return { action: "warning_issued", isNew: true }
  }

  const warningDate = demotionWarningAt ? new Date(demotionWarningAt) : now
  const gracePeriodEnd = new Date(warningDate)
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + graceDays)
  if (now < gracePeriodEnd) {
    return { action: "warning_issued", isNew: false }
  }

  return { action: "demoted", from: currentTier, to: stepDownTier(currentTier) }
}

export const applyVipDemotionStep = createStep(
  "apply-vip-demotion",
  async (input: ApplyVipDemotionInput, { container }) => {
    const vipScoreService = container.resolve(VIP_SCORE_MODULE) as any
    const customerModule = container.resolve(Modules.CUSTOMER)

    // Resolve once per workflow run, not per row.
    const { thresholds, graceDays } = await resolveVipDemotionConfig(container)

    const [score] = await vipScoreService.listVipScores({
      customer_id: input.customer_id,
    })
    if (!score) {
      return new StepResponse<ApplyVipDemotionOutput>({ action: "noop" })
    }

    const decision = decideDemotion({
      currentTier: score.current_tier,
      vipScore: input.vip_score,
      pendingDemotion: !!score.pending_demotion,
      demotionWarningAt: score.demotion_warning_at,
      thresholds,
      graceDays,
      now: new Date(),
    })

    if (decision.action === "noop") {
      return new StepResponse<ApplyVipDemotionOutput>({ action: "noop" })
    }

    if (decision.action === "retained") {
      return new StepResponse<ApplyVipDemotionOutput>({
        action: "retained",
        from_tier: score.current_tier,
      })
    }

    if (decision.action === "warning_cleared") {
      await vipScoreService.updateVipScores(score.id, {
        pending_demotion: false,
        demotion_warning_at: null,
      })
      return new StepResponse<ApplyVipDemotionOutput>({
        action: "warning_cleared",
        from_tier: score.current_tier,
      })
    }

    if (decision.action === "warning_issued") {
      const warnAt = decision.isNew
        ? new Date()
        : score.demotion_warning_at || new Date()
      if (decision.isNew) {
        await vipScoreService.updateVipScores(score.id, {
          pending_demotion: true,
          demotion_warning_at: warnAt,
        })
      }
      const graceEnd = new Date(warnAt)
      graceEnd.setDate(graceEnd.getDate() + graceDays)
      const msPerDay = 1000 * 60 * 60 * 24
      const daysRemaining = Math.max(
        0,
        Math.ceil((graceEnd.getTime() - Date.now()) / msPerDay)
      )
      return new StepResponse<ApplyVipDemotionOutput>({
        action: "warning_issued",
        from_tier: score.current_tier,
        is_new_warning: decision.isNew,
        days_remaining: daysRemaining,
      })
    }

    // decision.action === "demoted"
    const { from: tier, to: newTier } = decision
    const groups = await customerModule.listCustomerGroups({})
    const oldGroup = groups.find((g: any) => g.name === tier)
    const newGroup = groups.find((g: any) => g.name === newTier)

    if (oldGroup) {
      await customerModule.removeCustomerFromGroup({
        customer_id: input.customer_id,
        customer_group_id: oldGroup.id,
      })
    }
    if (newGroup) {
      await customerModule.addCustomerToGroup({
        customer_id: input.customer_id,
        customer_group_id: newGroup.id,
      })
    }

    await vipScoreService.updateVipScores(score.id, {
      current_tier: newTier,
      pending_demotion: false,
      demotion_warning_at: null,
    })

    return new StepResponse<ApplyVipDemotionOutput, any>(
      { action: "demoted", from_tier: tier, to_tier: newTier },
      { customer_id: input.customer_id, from_tier: tier, to_tier: newTier }
    )
  },
  async (compensationInput: any, { container }) => {
    if (!compensationInput) return
    const vipScoreService = container.resolve(VIP_SCORE_MODULE) as any
    const customerModule = container.resolve(Modules.CUSTOMER)

    const groups = await customerModule.listCustomerGroups({})
    const toGroup = groups.find((g: any) => g.name === compensationInput.to_tier)
    const fromGroup = groups.find((g: any) => g.name === compensationInput.from_tier)

    if (toGroup) {
      await customerModule.removeCustomerFromGroup({
        customer_id: compensationInput.customer_id,
        customer_group_id: toGroup.id,
      })
    }
    if (fromGroup) {
      await customerModule.addCustomerToGroup({
        customer_id: compensationInput.customer_id,
        customer_group_id: fromGroup.id,
      })
    }

    const [score] = await vipScoreService.listVipScores({
      customer_id: compensationInput.customer_id,
    })
    if (score) {
      await vipScoreService.updateVipScores(score.id, {
        current_tier: compensationInput.from_tier,
      })
    }
  }
)
