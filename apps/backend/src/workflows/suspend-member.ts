import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { assignCustomerGroupStep } from "./steps/assign-customer-group"
import { updateCustomerMetadataStep } from "./steps/update-customer-metadata"
import { getCustomerCurrentGroupStep } from "./steps/get-customer-current-group"
import { setAuthIdentityDisabledStep } from "./steps/set-auth-identity-disabled"

type SuspendMemberInput = {
  customer_id: string
}

const suspendMemberWorkflow = createWorkflow(
  "suspend-member",
  function (input: SuspendMemberInput) {
    const currentGroup = getCustomerCurrentGroupStep({
      customer_id: input.customer_id,
    })

    assignCustomerGroupStep({
      customer_id: input.customer_id,
      group_name: "suspended",
      remove_from_group: currentGroup,
    })

    updateCustomerMetadataStep({
      customer_id: input.customer_id,
      metadata: { status: "suspended", previous_group: currentGroup },
    })

    setAuthIdentityDisabledStep({
      customer_id: input.customer_id,
      disabled: true,
    })

    return new WorkflowResponse({ success: true })
  }
)

export default suspendMemberWorkflow
