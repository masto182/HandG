import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type GetCustomerPreviousGroupInput = {
  customer_id: string
}

export const getCustomerPreviousGroupStep = createStep(
  "get-customer-previous-group",
  async (input: GetCustomerPreviousGroupInput, { container }) => {
    const customerModule = container.resolve(Modules.CUSTOMER)

    const [customer] = await customerModule.listCustomers({
      id: input.customer_id,
    })

    const previousGroup = (customer?.metadata as any)?.previous_group || "approved"
    return new StepResponse(previousGroup)
  }
)
