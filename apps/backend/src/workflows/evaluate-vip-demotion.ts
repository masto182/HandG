import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { calculateVipScoreStep } from "./steps/calculate-vip-score"
import { applyVipDemotionStep } from "./steps/apply-vip-demotion"

type EvaluateVipDemotionInput = {
  customer_id: string
}

const evaluateVipDemotionWorkflow = createWorkflow(
  "evaluate-vip-demotion",
  function (input: EvaluateVipDemotionInput) {
    const scoreResult = calculateVipScoreStep({ customer_id: input.customer_id })

    const demotionInput = transform({ scoreResult, input }, (data: any) => ({
      customer_id: data.input.customer_id,
      vip_score: data.scoreResult.vip_score,
    }))

    const result = applyVipDemotionStep(demotionInput)
    return new WorkflowResponse(result)
  }
)

export default evaluateVipDemotionWorkflow
