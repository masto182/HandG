import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { calculateVipScoreStep } from "./steps/calculate-vip-score"
import { evaluateVipProgressionStep } from "./steps/evaluate-vip-progression"

type EvaluateVipProgressionInput = {
  customer_id: string
}

const evaluateVipProgressionWorkflow = createWorkflow(
  "evaluate-vip-progression",
  function (input: EvaluateVipProgressionInput) {
    const scoreResult = calculateVipScoreStep({
      customer_id: input.customer_id,
    })

    const progressionInput = transform(
      { scoreResult, input },
      (data: any) => ({
        customer_id: data.input.customer_id,
        vip_score: data.scoreResult.vip_score,
      })
    )

    const progressionResult = evaluateVipProgressionStep(progressionInput)

    return new WorkflowResponse(progressionResult)
  }
)

export default evaluateVipProgressionWorkflow
