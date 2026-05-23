import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import registerCustomerWorkflow from "../../../../workflows/register-customer"
import type { RegisterCustomerInput } from "./validators"

export async function POST(
  req: AuthenticatedMedusaRequest<RegisterCustomerInput>,
  res: MedusaResponse
) {
  const authIdentityId = req.auth_context?.auth_identity_id
  if (!authIdentityId) {
    res.status(401).json({
      error: "missing_registration_token",
      message:
        "Call sdk.auth.register('customer', 'emailpass', { email, password }) first and include the returned token as Authorization: Bearer <token>.",
    })
    return
  }

  const { result } = await registerCustomerWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      authIdentityId,
    },
  })

  const customer = result as any

  res.status(201).json({
    customer: {
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
    },
    message: "Registration submitted for approval",
  })
}
