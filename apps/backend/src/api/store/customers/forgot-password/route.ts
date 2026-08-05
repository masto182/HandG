import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"
import { sendTemplate } from "../../../../lib/email"
import * as PasswordResetEmailTpl from "../../../../emails/password-reset"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email } = (req.body || {}) as { email?: string }
  if (!email) return res.status(400).json({ error: "email required" })

  try {
    const customerModule = req.scope.resolve("customer") as any
    const customers = await customerModule.listCustomers({ email })

    if (customers.length) {
      const customer = customers[0]
      const rawToken = crypto.randomBytes(32).toString("hex")
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      await customerModule.updateCustomer(customer.id, {
        metadata: {
          ...(customer.metadata || {}),
          password_reset: { token_hash: tokenHash, expires_at: expiresAt },
        },
      })

      const storeUrl = process.env.STORE_URL || "http://localhost:8000"
      const resetUrl = `${storeUrl}/reset-password?email=${encodeURIComponent(email)}&token=${rawToken}`

      await sendTemplate({
        to: email,
        customerId: customer.id,
        category: "account",
        template: PasswordResetEmailTpl,
        props: {
          name: customer.first_name || "there",
          resetUrl,
          storeUrl,
        },
        container: req.scope,
      })
    }
  } catch (e) {
    // swallow — never expose whether the email exists
  }

  // Always 200 regardless of outcome
  return res.json({ ok: true })
}
