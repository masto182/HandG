import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import { assignCustomerGroupStep } from "./steps/assign-customer-group"
import { generateReferralCodeStep } from "./steps/generate-referral-code"
import { createVipScoreStep } from "./steps/create-vip-score"
import { updateCustomerMetadataStep } from "./steps/update-customer-metadata"
import { awardReferralBonusStep } from "./steps/award-referral-bonus"

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

    awardReferralBonusStep({ customer_id: input.customer_id })

    // Set metadata.status to "approved" after referral code is written so
    // the customer.updated subscriber fires with the correct final state and
    // sends the approval email with the referral code included.
    updateCustomerMetadataStep({
      customer_id: input.customer_id,
      metadata: { status: "approved" },
    })

    // customerModule.updateCustomers() does NOT auto-emit customer.updated —
    // Medusa's own updateCustomersWorkflow explicitly emits it via
    // emitEventStep, so we must too or the member-notifications subscriber
    // never fires and the approval email never sends.
    emitEventStep({
      eventName: "customer.updated",
      data: { id: input.customer_id },
    })

    return new WorkflowResponse(referralCode)
  }
)

export default approveMemberWorkflow
