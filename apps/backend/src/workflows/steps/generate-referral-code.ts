import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import crypto from "crypto"
import { REFERRAL_MODULE } from "../../modules/referral"

type GenerateReferralCodeInput = {
  customer_id: string
}

export const generateReferralCodeStep = createStep(
  "generate-referral-code",
  async (input: GenerateReferralCodeInput, { container }) => {
    const customerModule = container.resolve(Modules.CUSTOMER)
    const referralService = container.resolve(REFERRAL_MODULE) as any

    // Idempotent: if this customer already has a code, return it (re-approval
    // must not violate the unique customer_id index or churn the code).
    const [already] = await referralService.listReferralCodes({
      customer_id: input.customer_id,
    })
    if (already) {
      return new StepResponse({ referral_code: already.code, customer_id: input.customer_id }, null)
    }

    let code = ""
    let attempts = 0
    const maxAttempts = 10

    do {
      code = crypto.randomBytes(4).toString("hex").toUpperCase()
      // Indexed collision check (H7) — no full customer-table scan.
      const existing = await referralService.listReferralCodes({ code })
      if (!existing.length) break
      attempts++
    } while (attempts < maxAttempts)

    // Authoritative indexed lookup row.
    await referralService.createReferralCodes({
      customer_id: input.customer_id,
      code,
    })
    // Mirror onto customer.metadata for display (readers unchanged).
    await customerModule.updateCustomers(input.customer_id, {
      metadata: { referral_code: code },
    })

    return new StepResponse(
      { referral_code: code, customer_id: input.customer_id },
      { customer_id: input.customer_id, code }
    )
  },
  async (compensationInput, { container }) => {
    if (!compensationInput) return
    const customerModule = container.resolve(Modules.CUSTOMER)
    const referralService = container.resolve(REFERRAL_MODULE) as any
    await customerModule.updateCustomers(compensationInput.customer_id, {
      metadata: { referral_code: null },
    })
    const [row] = await referralService.listReferralCodes({
      customer_id: compensationInput.customer_id,
      code: compensationInput.code,
    })
    if (row) {
      await referralService.deleteReferralCodes(row.id)
    }
  }
)
