import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email, token, new_password } = (req.body || {}) as {
    email?: string
    token?: string
    new_password?: string
  }

  if (!email || !token || !new_password) {
    return res.status(400).json({ error: "email, token and new_password required" })
  }
  if (new_password.length < 12) {
    return res.status(400).json({ error: "new_password must be at least 12 characters" })
  }

  const customerModule = req.scope.resolve("customer") as any
  const customers = await customerModule.listCustomers({ email })
  if (!customers.length) {
    return res.status(400).json({ error: "invalid or expired token" })
  }

  const customer = customers[0]
  const reset = customer.metadata?.password_reset as
    { token_hash: string; expires_at: string } | undefined

  if (!reset?.token_hash || !reset?.expires_at) {
    return res.status(400).json({ error: "invalid or expired token" })
  }
  if (new Date(reset.expires_at) < new Date()) {
    return res.status(400).json({ error: "invalid or expired token" })
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
  if (tokenHash !== reset.token_hash) {
    return res.status(400).json({ error: "invalid or expired token" })
  }

  const authModule = req.scope.resolve("auth") as {
    updateProvider: (
      provider: string,
      data: { entity_id: string; password: string }
    ) => Promise<{ success: boolean; error?: string }>
  }
  const update = await authModule.updateProvider("emailpass", {
    entity_id: email,
    password: new_password,
  })
  if (!update?.success) {
    return res.status(500).json({ error: update?.error || "password update failed" })
  }

  // Clear reset token from metadata
  const { password_reset: _removed, ...restMeta } = customer.metadata || {}
  await customerModule.updateCustomer(customer.id, { metadata: restMeta })

  return res.json({ ok: true })
}
