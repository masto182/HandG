import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { REFERRAL_MODULE } from "../modules/referral"

type ToggleStealthInput = {
  customer_id: string
  enabled: boolean
}

const toggleStealthModeStep = createStep(
  "toggle-stealth-mode",
  async (input: ToggleStealthInput, { container }) => {
    const referralService = container.resolve(REFERRAL_MODULE) as any

    const referrals = await referralService.listReferrals({
      referred_customer_id: input.customer_id,
    })

    if (!referrals.length) {
      throw new Error("No referral relationship found")
    }

    const prev = referrals[0].stealth_mode
    await referralService.updateReferrals(referrals[0].id, {
      stealth_mode: !!input.enabled,
    })

    return new StepResponse(
      { stealth_mode: !!input.enabled },
      { referral_id: referrals[0].id, previous_stealth: prev }
    )
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const referralService = container.resolve(REFERRAL_MODULE) as any
    await referralService.updateReferrals(compensation.referral_id, {
      stealth_mode: compensation.previous_stealth,
    })
  }
)

export const toggleStealthModeWorkflow = createWorkflow(
  "toggle-stealth-mode",
  function (input: ToggleStealthInput) {
    const result = (toggleStealthModeStep as any)(input)
    return new WorkflowResponse(result)
  }
)
