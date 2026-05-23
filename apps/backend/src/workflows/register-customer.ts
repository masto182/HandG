import {
  createWorkflow,
  WorkflowResponse,
  transform,
  when,
} from "@medusajs/framework/workflows-sdk"
import { createCustomerAccountWorkflow } from "@medusajs/medusa/core-flows"
import { validateAgeStep } from "./steps/validate-age"
import { validateReferralCodeStep } from "./steps/validate-referral-code"
import { assignCustomerGroupStep } from "./steps/assign-customer-group"
import { createReferralStep } from "./steps/create-referral"

type RegisterCustomerInput = {
  authIdentityId: string
  email: string
  first_name: string
  last_name: string
  date_of_birth: string
  why_join: string
  favourite_brewery: string
  referral_code?: string
  untappd_id?: string
}

const registerCustomerWorkflow = createWorkflow(
  "register-customer",
  function (input: RegisterCustomerInput) {
    validateAgeStep({ date_of_birth: input.date_of_birth })

    const referralResult = validateReferralCodeStep({
      referral_code: input.referral_code,
    })

    const accountInput = transform({ input }, (data: any) => ({
      authIdentityId: data.input.authIdentityId,
      customerData: {
        email: data.input.email,
        first_name: data.input.first_name,
        last_name: data.input.last_name,
        metadata: {
          date_of_birth: data.input.date_of_birth,
          why_join: data.input.why_join,
          favourite_brewery: data.input.favourite_brewery,
          untappd_id: data.input.untappd_id || null,
          status: "pending",
        },
      },
    }))

    const customer = createCustomerAccountWorkflow.runAsStep({
      input: accountInput,
    })

    const customerId = transform(customer, (c: any) => c.id)

    assignCustomerGroupStep({
      customer_id: customerId,
      group_name: "pending",
    })

    const referralInput = transform(
      { referralResult, customerId, input },
      (data: any) => ({
        referrer_customer_id: data.referralResult.referrer_customer_id,
        referred_customer_id: data.customerId,
        referral_code: data.input.referral_code || "",
      })
    )

    when(referralResult, (result: any) => !!result.referrer_customer_id).then(
      function () {
        createReferralStep(referralInput)
      }
    )

    return new WorkflowResponse(customer)
  }
)

export default registerCustomerWorkflow
