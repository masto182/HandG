import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { EMAIL_LOG_MODULE } from "../../../modules/email-log"
import type EmailLogModuleService from "../../../modules/email-log/service"

/**
 * POST /webhooks/resend
 *
 * Receives delivery/engagement events from Resend (sent, delivered,
 * delivery_delayed, bounced, complained, opened, clicked, failed).
 * Verified via svix HMAC signature against the RAW request body.
 *
 * Raw-body preservation is configured in `src/api/middlewares.ts` against the
 * `/webhooks/resend` matcher (`bodyParser: { preserveRawBody: true }`), which
 * is what populates `req.rawBody`. It cannot be set from this file: Medusa's
 * route loader only reads AUTHENTICATE, CORS and HTTP-method exports, so a
 * route-level `export const config` is dropped without warning.
 *
 * Configure RESEND_WEBHOOK_SECRET (the "Signing Secret" from the Resend
 * dashboard's webhook config) in env.
 */

type ResendWebhookPayload = {
  type: string
  data: {
    email_id?: string
    click?: { link?: string }
    bounce?: { message?: string }
  }
}

const EVENT_MAP: Record<
  string,
  {
    status: string
    timestampField?: "delivered_at" | "opened_at" | "clicked_at" | "bounced_at" | "complained_at"
    incrementOpen?: boolean
    incrementClick?: boolean
  }
> = {
  "email.sent": { status: "sent" },
  "email.delivered": { status: "delivered", timestampField: "delivered_at" },
  "email.delivery_delayed": { status: "delayed" },
  "email.bounced": { status: "bounced", timestampField: "bounced_at" },
  "email.complained": { status: "complained", timestampField: "complained_at" },
  "email.opened": { status: "opened", timestampField: "opened_at", incrementOpen: true },
  "email.clicked": { status: "clicked", timestampField: "clicked_at", incrementClick: true },
  "email.failed": { status: "failed" },
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const secret = process.env.RESEND_WEBHOOK_SECRET

  if (!secret) {
    logger.warn("[resend-webhook] rejected: RESEND_WEBHOOK_SECRET not configured")
    res.status(503).json({ message: "webhook not configured" })
    return
  }

  const rawBody = (req as any).rawBody as Buffer | undefined
  if (!rawBody) {
    logger.warn("[resend-webhook] rejected: missing raw body")
    res.status(400).json({ message: "missing raw body" })
    return
  }

  let payload: ResendWebhookPayload
  try {
    const { Webhook } = await import("svix")
    const wh = new Webhook(secret)
    payload = wh.verify(rawBody, req.headers as Record<string, string>) as ResendWebhookPayload
  } catch (err) {
    logger.warn(`[resend-webhook] signature verification failed: ${(err as Error).message}`)
    res.status(401).json({ message: "invalid signature" })
    return
  }

  const mapping = EVENT_MAP[payload.type]
  const emailId = payload.data?.email_id

  if (!mapping || !emailId) {
    res.status(202).json({ message: "ignored" })
    return
  }

  try {
    const emailLogService = req.scope.resolve(EMAIL_LOG_MODULE) as EmailLogModuleService
    const applied = await emailLogService.applyWebhookEvent(emailId, {
      status: mapping.status as any,
      timestampField: mapping.timestampField,
      incrementOpen: mapping.incrementOpen,
      incrementClick: mapping.incrementClick,
      errorReason:
        payload.type === "email.bounced" ? (payload.data?.bounce?.message ?? null) : undefined,
      rawEvent: payload as unknown as Record<string, unknown>,
    })
    if (!applied) {
      logger.warn(`[resend-webhook] no matching email_log row for resend_id=${emailId}`)
      res.status(404).json({ message: "email log not found" })
      return
    }
  } catch (err) {
    logger.warn(`[resend-webhook] persist failed: ${(err as Error).message}`)
    res.status(500).json({ message: "persist failed" })
    return
  }

  res.status(200).json({ ok: true })
}
