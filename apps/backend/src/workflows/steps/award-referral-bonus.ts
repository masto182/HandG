import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { REFERRAL_MODULE } from "../../modules/referral"
import { VIP_SCORE_MODULE } from "../../modules/vip-score"

type AwardReferralBonusInput = {
  customer_id: string
}

export const awardReferralBonusStep = createStep(
  "award-referral-bonus",
  async (input: AwardReferralBonusInput, { container }) => {
    const referralService = container.resolve(REFERRAL_MODULE) as any

    const [referral] = await referralService.listReferrals({
      referred_customer_id: input.customer_id,
    })
    if (!referral) {
      return new StepResponse(null)
    }

    const vipScoreService = container.resolve(VIP_SCORE_MODULE) as any
    await vipScoreService.addReferralSignupBonus(referral.referrer_customer_id, input.customer_id)

    return new StepResponse(null)
  }
)
