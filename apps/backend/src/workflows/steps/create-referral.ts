import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { REFERRAL_MODULE } from "../../modules/referral"

type CreateReferralInput = {
  referrer_customer_id: string | null
  referred_customer_id: string
  referral_code: string
}

export const createReferralStep = createStep(
  "create-referral",
  async (input: CreateReferralInput, { container }) => {
    if (!input.referrer_customer_id) {
      return new StepResponse(null)
    }

    const referralService = container.resolve(REFERRAL_MODULE) as any
    const referral = await referralService.createReferrals({
      referrer_customer_id: input.referrer_customer_id,
      referred_customer_id: input.referred_customer_id,
      referral_code: input.referral_code,
      stealth_mode: false,
    })

    return new StepResponse(referral, referral.id)
  },
  async (id: string | undefined, { container }) => {
    if (!id) return
    const referralService = container.resolve(REFERRAL_MODULE) as any
    await referralService.deleteReferrals(id)
  }
)
