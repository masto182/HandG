import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { calculateVipScoreStep } from "./steps/calculate-vip-score"

type CalculateVipScoreWorkflowInput = {
  customer_id: string
}

const calculateVipScoreWorkflow = createWorkflow(
  "calculate-vip-score",
  function (input: CalculateVipScoreWorkflowInput) {
    const scoreResult = calculateVipScoreStep({
      customer_id: input.customer_id,
    })

    return new WorkflowResponse(scoreResult)
  }
)

export default calculateVipScoreWorkflow
