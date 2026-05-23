import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type GetCustomerCurrentGroupInput = {
  customer_id: string
}

const TIER_GROUPS = ["pending", "approved", "vip1", "vip2", "vip3", "vip4", "vip5", "suspended"]

export const getCustomerCurrentGroupStep = createStep(
  "get-customer-current-group",
  async (input: GetCustomerCurrentGroupInput, { container }) => {
    const customerModule = container.resolve(Modules.CUSTOMER)

    const groups = await customerModule.listCustomerGroups({})
    const customerGroups = await customerModule.listCustomerGroupCustomers({
      customer_id: input.customer_id,
    })

    const customerGroupIds = customerGroups.map((cg: any) => cg.customer_group_id)
    const matchedGroup = groups.find(
      (g: any) => customerGroupIds.includes(g.id) && TIER_GROUPS.includes(g.name)
    )

    return new StepResponse(matchedGroup?.name || "approved")
  }
)
