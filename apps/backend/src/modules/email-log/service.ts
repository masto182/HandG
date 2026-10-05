import { ContainerRegistrationKeys, MedusaService } from "@medusajs/framework/utils"
import EmailLog from "./models/email-log"

const POSITIVE_STATUS_RANK: Record<string, number> = {
  queued: 0,
  sent: 0,
  delayed: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
}

const NEGATIVE_STATUSES = new Set(["bounced", "complained", "failed"])

function resolveNextStatus(
  current: string | null | undefined,
  incoming: EmailLogStatus
): EmailLogStatus {
  if (NEGATIVE_STATUSES.has(incoming)) return incoming
  if (!current) return incoming
  if (NEGATIVE_STATUSES.has(current)) return current as EmailLogStatus

  const currentRank = POSITIVE_STATUS_RANK[current] ?? -1
  const incomingRank = POSITIVE_STATUS_RANK[incoming] ?? -1

  return incomingRank > currentRank ? incoming : (current as EmailLogStatus)
}

export type EmailLogStatus =
  "sent" | "delivered" | "delayed" | "bounced" | "complained" | "opened" | "clicked" | "failed"

export type CreateEmailLogInput = {
  resend_id?: string | null
  to_address: string
  category: string
  template_name: string
  subject?: string | null
  customer_id?: string | null
  status?: EmailLogStatus
  sent_at?: Date
  error_reason?: string | null
}

class EmailLogModuleService extends MedusaService({
  EmailLog,
}) {
  protected pgConnection_: {
    raw: (sql: string, bindings?: unknown[]) => Promise<unknown>
  } | null = null

  constructor(...args: any[]) {
    super(...args)
    this.pgConnection_ =
      args[0]?.__pg_connection__ ?? args[0]?.[ContainerRegistrationKeys.PG_CONNECTION] ?? null
  }

  /**
   * Record a send attempt. Never throws — logging must never block a real
   * send. Callers should wrap this in try/catch anyway as a second layer of
   * defence.
   */
  async recordSend(input: CreateEmailLogInput) {
    return (this as any).createEmailLogs({
      resend_id: input.resend_id ?? null,
      to_address: input.to_address,
      category: input.category,
      template_name: input.template_name,
      subject: input.subject ?? null,
      customer_id: input.customer_id ?? null,
      status: input.status ?? "sent",
      sent_at: input.sent_at ?? new Date(),
      error_reason: input.error_reason ?? null,
    })
  }

  /**
   * Apply a webhook event to the matching log row (looked up by resend_id).
   * Returns false if no matching row was found (e.g. event arrived before
   * the initial row was persisted, or resend_id wasn't captured).
   */
  async applyWebhookEvent(
    resendId: string,
    update: {
      status: EmailLogStatus
      timestampField?: "delivered_at" | "opened_at" | "clicked_at" | "bounced_at" | "complained_at"
      incrementOpen?: boolean
      incrementClick?: boolean
      errorReason?: string | null
      rawEvent: Record<string, unknown>
    }
  ): Promise<boolean> {
    const rows = (await (this as any).listEmailLogs({
      resend_id: resendId,
    })) as Array<{
      id: string
      status?: string | null
      open_count: number
      click_count: number
      raw_events: unknown[] | null
    }>

    if (rows.length === 0) return false

    const row = rows[0]
    const now = new Date()
    const rawEvents = Array.isArray(row.raw_events) ? row.raw_events : []
    rawEvents.push({ received_at: now.toISOString(), ...update.rawEvent })

    const data: Record<string, unknown> = {
      status: resolveNextStatus(row.status, update.status),
      last_event_at: now,
      raw_events: rawEvents.slice(-50),
    }
    if (update.timestampField) data[update.timestampField] = now
    if (update.errorReason !== undefined) data.error_reason = update.errorReason
    if (update.incrementOpen) {
      if (this.pgConnection_) {
        await this.pgConnection_.raw(
          `UPDATE email_log SET open_count = COALESCE(open_count, 0) + 1, updated_at = now() WHERE id = ?`,
          [row.id]
        )
      } else {
        data.open_count = (row.open_count ?? 0) + 1
      }
    }
    if (update.incrementClick) {
      if (this.pgConnection_) {
        await this.pgConnection_.raw(
          `UPDATE email_log SET click_count = COALESCE(click_count, 0) + 1, updated_at = now() WHERE id = ?`,
          [row.id]
        )
      } else {
        data.click_count = (row.click_count ?? 0) + 1
      }
    }

    await (this as any).updateEmailLogs({
      selector: { id: row.id },
      data,
    })
    return true
  }
}

export default EmailLogModuleService
