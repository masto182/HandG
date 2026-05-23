import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { VIP_SCORE_MODULE } from "../../modules/vip-score"

type CreateVipScoreInput = {
  customer_id: string
}

export const createVipScoreStep = createStep(
  "create-vip-score",
  async (input: CreateVipScoreInput, { container }) => {
    const vipScoreService = container.resolve(VIP_SCORE_MODULE) as any

    const vipScore = await vipScoreService.createVipScores({
      customer_id: input.customer_id,
      personal_spend_12mo: 0,
      network_spend_12mo: 0,
      vip_score: 0,
      order_count_12mo: 0,
      current_tier: "approved",
      tier_achieved_at: new Date(),
      pending_demotion: false,
    })

    return new StepResponse(vipScore, vipScore.id)
  },
  async (id: string | undefined, { container }) => {
    if (!id) return
    const vipScoreService = container.resolve(VIP_SCORE_MODULE) as any
    await vipScoreService.deleteVipScores(id)
  }
)
