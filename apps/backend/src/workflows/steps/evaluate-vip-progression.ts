import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { getHighestEligibleTier, getTierIndex, VipTier } from "../constants/vip-tiers"
import { VIP_SCORE_MODULE } from "../../modules/vip-score"

type EvaluateProgressionInput = {
  customer_id: string
  vip_score: number
}

type ProgressionResult = {
  promoted: boolean
  new_tier: string | null
  previous_tier?: string | null
  awaiting_vip5_approval?: boolean
}

/**
 * Pure decision function — extracted for unit testing without container/IO.
 *
 * Returns:
 *   - {action: 'noop'} when score doesn't qualify for promotion
 *   - {action: 'await_vip5_approval'} when eligible for VIP5 but not pre-approved
 *   - {action: 'promote', newTier} when ready to promote
 */
export type ProgressionDecision =
  | { action: "noop" }
  | { action: "await_vip5_approval"; newTier: "vip5" }
  | { action: "promote"; newTier: VipTier; previousTier: VipTier }

export function decideProgression(
  currentTier: VipTier,
  vipScore: number,
  vip5PreApproved: boolean
): ProgressionDecision {
  const eligibleTier = getHighestEligibleTier(vipScore)
  const currentIdx = getTierIndex(currentTier)
  const eligibleIdx = getTierIndex(eligibleTier)

  if (eligibleIdx <= currentIdx) {
    return { action: "noop" }
  }

  if (eligibleTier === "vip5" && !vip5PreApproved) {
    return { action: "await_vip5_approval", newTier: "vip5" }
  }

  return { action: "promote", newTier: eligibleTier, previousTier: currentTier }
}

export const evaluateVipProgressionStep = createStep(
  "evaluate-vip-progression",
  async (input: EvaluateProgressionInput, { container }) => {
    const vipScoreService = container.resolve(VIP_SCORE_MODULE) as any
    const customerModule = container.resolve(Modules.CUSTOMER)

    const [scoreRecord] = await vipScoreService.listVipScores({
      customer_id: input.customer_id,
    })
    if (!scoreRecord) {
      return new StepResponse<ProgressionResult>({ promoted: false, new_tier: null })
    }

    const [customer] = await customerModule.listCustomers({ id: input.customer_id })
    const metadata = (customer?.metadata as any) || {}
    const vip5PreApproved = !!metadata.vip5_pre_approved

    const decision = decideProgression(
      scoreRecord.current_tier as VipTier,
      input.vip_score,
      vip5PreApproved
    )

    if (decision.action === "noop") {
      return new StepResponse<ProgressionResult>({ promoted: false, new_tier: null })
    }

    if (decision.action === "await_vip5_approval") {
      await customerModule.updateCustomers(input.customer_id, {
        metadata: { ...metadata, vip5_pending_approval: true },
      })
      return new StepResponse<ProgressionResult>({
        promoted: false,
        new_tier: null,
        awaiting_vip5_approval: true,
      })
    }

    const { newTier, previousTier } = decision
    const groups = await customerModule.listCustomerGroups({})
    const currentGroup = groups.find((g: any) => g.name === previousTier)
    const newGroup = groups.find((g: any) => g.name === newTier)

    if (currentGroup) {
      await customerModule.removeCustomerFromGroup({
        customer_id: input.customer_id,
        customer_group_id: currentGroup.id,
      })
    }
    if (newGroup) {
      await customerModule.addCustomerToGroup({
        customer_id: input.customer_id,
        customer_group_id: newGroup.id,
      })
    }

    await vipScoreService.updateVipScores(scoreRecord.id, {
      current_tier: newTier,
      tier_achieved_at: new Date(),
      pending_demotion: false,
      demotion_warning_at: null,
    })

    return new StepResponse<ProgressionResult, any>(
      {
        promoted: true,
        new_tier: newTier,
        previous_tier: previousTier,
      },
      {
        customer_id: input.customer_id,
        previous_tier: previousTier,
        new_tier: newTier,
      }
    )
  },
  async (compensationInput: any, { container }) => {
    if (!compensationInput) return
    const vipScoreService = container.resolve(VIP_SCORE_MODULE) as any
    const customerModule = container.resolve(Modules.CUSTOMER)

    const groups = await customerModule.listCustomerGroups({})
    const newGroup = groups.find((g: any) => g.name === compensationInput.new_tier)
    const prevGroup = groups.find((g: any) => g.name === compensationInput.previous_tier)

    if (newGroup) {
      await customerModule.removeCustomerFromGroup({
        customer_id: compensationInput.customer_id,
        customer_group_id: newGroup.id,
      })
    }
    if (prevGroup) {
      await customerModule.addCustomerToGroup({
        customer_id: compensationInput.customer_id,
        customer_group_id: prevGroup.id,
      })
    }

    const [scoreRecord] = await vipScoreService.listVipScores({
      customer_id: compensationInput.customer_id,
    })
    if (scoreRecord) {
      await vipScoreService.updateVipScores(scoreRecord.id, {
        current_tier: compensationInput.previous_tier,
      })
    }
  }
)
