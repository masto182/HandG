import { MedusaService } from "@medusajs/framework/utils"
import crypto from "crypto"
import EmailChangeRequest from "./models/email-change-request"

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export type CreateRequestResult = {
  token: string
  expires_at: Date
  customer_id: string
  new_email: string
}

export type ConsumeTokenResult =
  | { ok: true; customer_id: string; new_email: string }
  | { ok: false; reason: "not_found" | "expired" | "already_used" }

class EmailChangeRequestModuleService extends MedusaService({
  EmailChangeRequest,
}) {
  /**
   * Generate a secure random token (URL-safe).
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString("base64url")
  }

  /**
   * Create a new email-change request. Invalidates any existing pending
   * requests for the same customer (single in-flight policy).
   */
  async createRequest(
    customerId: string,
    newEmail: string
  ): Promise<CreateRequestResult> {
    // Soft-delete any prior unused requests for this customer
    const existing = (await (this as any).listEmailChangeRequests({
      customer_id: customerId,
      used_at: null,
    })) as Array<{ id: string }>
    if (existing.length) {
      await (this as any).deleteEmailChangeRequests(existing.map((r) => r.id))
    }

    const token = this.generateToken()
    const expires_at = new Date(Date.now() + TOKEN_TTL_MS)

    const created = (await (this as any).createEmailChangeRequests({
      customer_id: customerId,
      new_email: newEmail,
      token,
      expires_at,
    })) as { id: string }

    void created
    return { token, expires_at, customer_id: customerId, new_email: newEmail }
  }

  /**
   * Validate + consume a token. On success, marks the request used so it
   * cannot be replayed.
   */
  async consumeToken(token: string): Promise<ConsumeTokenResult> {
    const rows = (await (this as any).listEmailChangeRequests({ token })) as Array<{
      id: string
      customer_id: string
      new_email: string
      expires_at: Date
      used_at: Date | null
    }>
    const row = rows[0]
    if (!row) return { ok: false, reason: "not_found" }
    if (row.used_at) return { ok: false, reason: "already_used" }
    const expires = new Date(row.expires_at).getTime()
    if (Number.isNaN(expires) || expires < Date.now()) {
      return { ok: false, reason: "expired" }
    }

    await (this as any).updateEmailChangeRequests({
      selector: { id: row.id },
      data: { used_at: new Date() },
    })

    return { ok: true, customer_id: row.customer_id, new_email: row.new_email }
  }
}

export default EmailChangeRequestModuleService
