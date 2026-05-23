import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import crypto from "crypto"

type GenerateReferralCodeInput = {
  customer_id: string
}

export const generateReferralCodeStep = createStep(
  "generate-referral-code",
  async (input: GenerateReferralCodeInput, { container }) => {
    const customerModule = container.resolve(Modules.CUSTOMER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    let code: string = ""
    let attempts = 0
    const maxAttempts = 10

    do {
      code = crypto.randomBytes(4).toString("hex").toUpperCase()
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "metadata"],
      })
      const collision = customers.find(
        (c: any) => c.metadata?.referral_code === code
      )
      if (!collision) break
      attempts++
    } while (attempts < maxAttempts)

    await customerModule.updateCustomers(input.customer_id, {
      metadata: { referral_code: code },
    })

    return new StepResponse(
      { referral_code: code, customer_id: input.customer_id },
      { customer_id: input.customer_id }
    )
  },
  async (compensationInput, { container }) => {
    if (!compensationInput) return
    const customerModule = container.resolve(Modules.CUSTOMER)
    await customerModule.updateCustomers(compensationInput.customer_id, {
      metadata: { referral_code: null },
    })
  }
)
