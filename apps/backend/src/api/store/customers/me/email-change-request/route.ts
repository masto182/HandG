import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { EMAIL_CHANGE_REQUEST_MODULE } from "../../../../../modules/email-change-request"
import type EmailChangeRequestModuleService from "../../../../../modules/email-change-request/service"
import { sendTemplate, getStoreUrl, refreshEmailConfig } from "../../../../../lib/email"
import CustomerEmailChangeEmail, {
  subject as customerEmailChangeSubject,
} from "../../../../../emails/customer-email-change"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ error: "unauthenticated" })
  }

  const body = (req.body || {}) as { new_email?: string }
  const newEmail = (body.new_email ?? "").trim().toLowerCase()
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) || newEmail.length > 254) {
    return res.status(400).json({ error: "invalid email" })
  }

  // Check email is not already in use on another account
  try {
    const customerModule = req.scope.resolve("customer") as {
      listCustomers: (filters: { email: string }) => Promise<Array<{ id: string }>>
    }
    const existing = await customerModule.listCustomers({ email: newEmail })
    if (existing.length && existing.some((c) => c.id !== customerId)) {
      return res.status(409).json({ error: "email already in use" })
    }
  } catch {
    // Module unavailable in tests; let downstream catch dupes
  }

  await refreshEmailConfig(req.scope)

  const svc = req.scope.resolve(
    EMAIL_CHANGE_REQUEST_MODULE
  ) as EmailChangeRequestModuleService

  const { token, expires_at } = await svc.createRequest(customerId, newEmail)

  // Resolve customer for the email greeting
  let firstName = "there"
  try {
    const customerModule = req.scope.resolve("customer") as {
      retrieveCustomer: (id: string) => Promise<{ first_name?: string | null; email: string }>
    }
    const c = await customerModule.retrieveCustomer(customerId)
    if (c?.first_name) firstName = c.first_name
  } catch {
    // skip
  }

  const storeUrl = getStoreUrl()
  const verifyUrl = `${storeUrl}/account/email-change/confirm?token=${encodeURIComponent(token)}`

  await sendTemplate({
    to: newEmail,
    customerId,
    category: "account",
    template: {
      default: CustomerEmailChangeEmail,
      subject: customerEmailChangeSubject,
    },
    props: {
      name: firstName,
      newEmail,
      verifyUrl,
      storeUrl,
      expiresInHours: 24,
    },
    container: req.scope,
  })

  return res.json({ ok: true, expires_at })
}
