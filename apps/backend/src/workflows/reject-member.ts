import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import { assignCustomerGroupStep } from "./steps/assign-customer-group"
import { updateCustomerMetadataStep } from "./steps/update-customer-metadata"
import { setAuthIdentityDisabledStep } from "./steps/set-auth-identity-disabled"

type RejectMemberInput = {
  customer_id: string
}

const rejectMemberWorkflow = createWorkflow("reject-member", function (input: RejectMemberInput) {
  assignCustomerGroupStep({
    customer_id: input.customer_id,
    group_name: "suspended",
    remove_from_group: "pending",
  })

  updateCustomerMetadataStep({
    customer_id: input.customer_id,
    metadata: { status: "rejected" },
  })

  // customerModule.updateCustomers() does NOT auto-emit customer.updated —
  // must emit explicitly or the member-notifications subscriber never
  // fires and the rejection email never sends.
  emitEventStep({
    eventName: "customer.updated",
    data: { id: input.customer_id },
  })

  setAuthIdentityDisabledStep({
    customer_id: input.customer_id,
    disabled: true,
  })

  return new WorkflowResponse({ success: true })
})

export default rejectMemberWorkflow
