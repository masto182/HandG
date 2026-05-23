import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { assignCustomerGroupStep } from "./steps/assign-customer-group"
import { generateReferralCodeStep } from "./steps/generate-referral-code"
import { createVipScoreStep } from "./steps/create-vip-score"

type ApproveMemberInput = {
  customer_id: string
}

const approveMemberWorkflow = createWorkflow(
  "approve-member",
  function (input: ApproveMemberInput) {
    assignCustomerGroupStep({
      customer_id: input.customer_id,
      group_name: "approved",
      remove_from_group: "pending",
    })

    const referralCode = generateReferralCodeStep({
      customer_id: input.customer_id,
    })

    createVipScoreStep({ customer_id: input.customer_id })

    return new WorkflowResponse(referralCode)
  }
)

export default approveMemberWorkflow
