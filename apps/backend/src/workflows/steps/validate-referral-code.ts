import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { REFERRAL_MODULE } from "../../modules/referral"

type ValidateReferralCodeInput = {
  referral_code?: string
}

type ValidateReferralCodeOutput = {
  referrer_customer_id: string | null
}

export const validateReferralCodeStep = createStep(
  "validate-referral-code",
  async (
    input: ValidateReferralCodeInput,
    { container }
  ): Promise<StepResponse<ValidateReferralCodeOutput>> => {
    if (!input.referral_code) {
      return new StepResponse({ referrer_customer_id: null })
    }

    // Indexed lookup (H7) — no full customer-table scan.
    const referralService = container.resolve(REFERRAL_MODULE) as any
    const [match] = await referralService.listReferralCodes({
      code: input.referral_code,
    })

    return new StepResponse({
      referrer_customer_id: match ? match.customer_id : null,
    })
  }
)
