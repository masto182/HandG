import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { assignCustomerGroupStep } from "./steps/assign-customer-group"
import { updateCustomerMetadataStep } from "./steps/update-customer-metadata"
import { getCustomerPreviousGroupStep } from "./steps/get-customer-previous-group"
import { setAuthIdentityDisabledStep } from "./steps/set-auth-identity-disabled"

type ReactivateMemberInput = {
  customer_id: string
}

const reactivateMemberWorkflow = createWorkflow(
  "reactivate-member",
  function (input: ReactivateMemberInput) {
    const previousGroup = getCustomerPreviousGroupStep({
      customer_id: input.customer_id,
    })

    assignCustomerGroupStep({
      customer_id: input.customer_id,
      group_name: previousGroup,
      remove_from_group: "suspended",
    })

    updateCustomerMetadataStep({
      customer_id: input.customer_id,
      metadata: { status: "active", previous_group: null },
    })

    setAuthIdentityDisabledStep({
      customer_id: input.customer_id,
      disabled: false,
    })

    return new WorkflowResponse({ success: true })
  }
)

export default reactivateMemberWorkflow
