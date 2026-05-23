import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type ValidateReferralCodeInput = {
  referral_code?: string
}

type ValidateReferralCodeOutput = {
  referrer_customer_id: string | null
}

export const validateReferralCodeStep = createStep(
  "validate-referral-code",
  async (input: ValidateReferralCodeInput, { container }): Promise<StepResponse<ValidateReferralCodeOutput>> => {
    if (!input.referral_code) {
      return new StepResponse({ referrer_customer_id: null })
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "metadata"],
    })

    const referrer = customers.find(
      (c: any) => c.metadata?.referral_code === input.referral_code
    )

    return new StepResponse({
      referrer_customer_id: referrer ? referrer.id : null,
    })
  }
)
