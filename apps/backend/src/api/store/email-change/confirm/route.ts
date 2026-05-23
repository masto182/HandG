import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { EMAIL_CHANGE_REQUEST_MODULE } from "../../../../modules/email-change-request"
import type EmailChangeRequestModuleService from "../../../../modules/email-change-request/service"

/**
 * Public (unauthenticated) endpoint hit from the verification email link.
 * Token is the only credential. On success: swaps customer.email + auth
 * provider entity_id to the new email.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as { token?: string }
  const token = (body.token ?? "").trim()
  if (!token) return res.status(400).json({ error: "token required" })

  const svc = req.scope.resolve(
    EMAIL_CHANGE_REQUEST_MODULE
  ) as EmailChangeRequestModuleService

  const result = await svc.consumeToken(token)
  if (!result.ok) {
    const code = result.reason === "expired" ? 410 : 404
    return res.status(code).json({ ok: false, reason: result.reason })
  }

  const { customer_id, new_email } = result

  // 1. Update customer.email
  try {
    const customerModule = req.scope.resolve("customer") as {
      retrieveCustomer: (id: string) => Promise<{ id: string; email: string }>
      updateCustomers: (id: string, data: Record<string, unknown>) => Promise<unknown>
    }
    const customer = await customerModule.retrieveCustomer(customer_id)
    const oldEmail = customer.email

    await customerModule.updateCustomers(customer_id, { email: new_email })

    // 2. Update auth identity provider entity_id
    try {
      const authModule = req.scope.resolve("auth") as {
        listProviderIdentities: (
          filters: { entity_id: string; provider: string }
        ) => Promise<Array<{ id: string }>>
        updateProviderIdentities: (
          data: Array<{ id: string; entity_id: string }>
        ) => Promise<unknown>
      }
      const identities = await authModule.listProviderIdentities({
        entity_id: oldEmail,
        provider: "emailpass",
      })
      if (identities.length) {
        await authModule.updateProviderIdentities(
          identities.map((pi) => ({ id: pi.id, entity_id: new_email }))
        )
      }
    } catch (authError) {
      console.error(
        "[email-change-confirm] auth identity update failed:",
        authError
      )
      // customer.email is updated but auth identity isn't — login will use new email only
      // if auth lookup falls back to customer.email. Surface partial success.
      return res
        .status(207)
        .json({ ok: true, partial: true, warning: "auth_update_failed" })
    }

    return res.json({ ok: true, email: new_email })
  } catch (e: any) {
    console.error("[email-change-confirm] update failed:", e)
    return res.status(500).json({ ok: false, error: e?.message || "update failed" })
  }
}
