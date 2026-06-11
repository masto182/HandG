import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import { assignCustomerGroupStep } from "./steps/assign-customer-group"
import { generateReferralCodeStep } from "./steps/generate-referral-code"
import { createVipScoreStep } from "./steps/create-vip-score"
import { updateCustomerMetadataStep } from "./steps/update-customer-metadata"

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

    // Set metadata.status to "approved" after referral code is written so
    // the customer.updated subscriber fires with the correct final state and
    // sends the approval email with the referral code included.
    updateCustomerMetadataStep({
      customer_id: input.customer_id,
      metadata: { status: "approved" },
    })

    return new WorkflowResponse(referralCode)
  }
)

export default approveMemberWorkflow
