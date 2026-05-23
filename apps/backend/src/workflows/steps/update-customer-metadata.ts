import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type UpdateCustomerMetadataInput = {
  customer_id: string
  metadata: Record<string, unknown>
}

export const updateCustomerMetadataStep = createStep(
  "update-customer-metadata",
  async (input: UpdateCustomerMetadataInput, { container }) => {
    const customerModule = container.resolve(Modules.CUSTOMER)

    const [customer] = await customerModule.listCustomers({
      id: input.customer_id,
    })
    const previousMetadata = customer?.metadata || {}

    await customerModule.updateCustomers(input.customer_id, {
      metadata: { ...previousMetadata, ...input.metadata },
    })

    return new StepResponse(
      { customer_id: input.customer_id },
      { customer_id: input.customer_id, previousMetadata }
    )
  },
  async (compensationInput, { container }) => {
    if (!compensationInput) return
    const customerModule = container.resolve(Modules.CUSTOMER)
    await customerModule.updateCustomers(compensationInput.customer_id, {
      metadata: compensationInput.previousMetadata,
    })
  }
)
