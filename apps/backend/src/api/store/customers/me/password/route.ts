import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

/**
 * Authenticated password change for the current customer. Verifies the old
 * password before updating to the new one. Uses Medusa's built-in emailpass
 * provider via the auth module.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ error: "unauthenticated" })
  }

  const body = (req.body || {}) as {
    old_password?: string
    new_password?: string
  }
  const oldPassword = body.old_password || ""
  const newPassword = body.new_password || ""

  if (!oldPassword) {
    return res.status(400).json({ error: "old_password required" })
  }
  if (!newPassword || newPassword.length < 12) {
    return res
      .status(400)
      .json({ error: "new_password must be at least 12 characters" })
  }
  if (oldPassword === newPassword) {
    return res
      .status(400)
      .json({ error: "new_password must differ from old_password" })
  }

  // Resolve customer to find email (which is the auth identity entity_id).
  let email: string
  try {
    const customerModule = req.scope.resolve("customer") as {
      retrieveCustomer: (id: string) => Promise<{ email: string }>
    }
    const c = await customerModule.retrieveCustomer(customerId)
    email = c.email
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "customer lookup failed" })
  }

  const authModule = req.scope.resolve("auth") as {
    authenticate: (
      provider: string,
      data: { body?: Record<string, unknown> }
    ) => Promise<{ success: boolean; error?: string }>
    updateProvider: (
      provider: string,
      data: { entity_id: string; password: string }
    ) => Promise<{ success: boolean; error?: string }>
  }

  // 1. Verify old password
  const auth = await authModule.authenticate("emailpass", {
    body: { email, password: oldPassword },
  })
  if (!auth?.success) {
    return res.status(401).json({ error: "incorrect old password" })
  }

  // 2. Update password
  const update = await authModule.updateProvider("emailpass", {
    entity_id: email,
    password: newPassword,
  })
  if (!update?.success) {
    return res
      .status(500)
      .json({ error: update?.error || "password update failed" })
  }

  return res.json({ ok: true })
}
