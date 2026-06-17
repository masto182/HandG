import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EMAIL_CHANGE_REQUEST_MODULE } from "../../../../modules/email-change-request"
import type EmailChangeRequestModuleService from "../../../../modules/email-change-request/service"

/**
 * Public (unauthenticated) endpoint hit from the verification email link.
 * Token is the only credential. On success: swaps auth provider entity_id
 * FIRST (login credential), then customer.email (display value).
 *
 * Operation order: auth identity first means a failure on the customer.email
 * update leaves the user able to log in with their new email. Reverse order
 * risked a login lockout if the auth update failed after customer.email changed.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as { token?: string }
  const token = (body.token ?? "").trim()
  if (!token) return res.status(400).json({ error: "token required" })

  const svc = req.scope.resolve(EMAIL_CHANGE_REQUEST_MODULE) as EmailChangeRequestModuleService

  const result = await svc.consumeToken(token)
  if (!result.ok) {
    const code = result.reason === "expired" ? 410 : 404
    return res.status(code).json({ ok: false, reason: result.reason })
  }

  const { customer_id, new_email } = result

  try {
    const customerModule = req.scope.resolve("customer") as {
      retrieveCustomer: (id: string) => Promise<{ id: string; email: string }>
      updateCustomers: (id: string, data: Record<string, unknown>) => Promise<unknown>
    }
    const authModule = req.scope.resolve("auth") as {
      listProviderIdentities: (filters: {
        entity_id: string
        provider: string
      }) => Promise<Array<{ id: string }>>
      updateProviderIdentities: (data: Array<{ id: string; entity_id: string }>) => Promise<unknown>
    }

    const customer = await customerModule.retrieveCustomer(customer_id)
    const oldEmail = customer.email

    // Step 1: Update auth identity (login credential) first.
    // If this fails, customer.email is still the old value so login still works.
    const identities = await authModule.listProviderIdentities({
      entity_id: oldEmail,
      provider: "emailpass",
    })
    if (identities.length) {
      await authModule.updateProviderIdentities(
        // workflow-exempt
        // workflow-exempt
        // workflow-exempt
        identities.map((pi) => ({ id: pi.id, entity_id: new_email }))
      )
    }

    // Step 2: Update customer.email (display value).
    // If this fails the user can still log in with new_email — partial state
    // but not a lockout. Return 207 so the client knows to surface a warning.
    try {
      await customerModule.updateCustomers(customer_id, { email: new_email }) // workflow-exempt
    } catch (displayErr: any) {
      console.error("[email-change-confirm] customer.email display update failed:", displayErr)
      return res
        .status(207)
        .json({ ok: true, partial: true, warning: "display_email_update_failed" })
    }

    return res.json({ ok: true, email: new_email })
  } catch (e: any) {
    console.error("[email-change-confirm] update failed:", e)
    return res.status(500).json({ ok: false, error: e?.message || "update failed" })
  }
}
