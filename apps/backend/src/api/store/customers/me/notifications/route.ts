import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INBOX_MODULE } from "../../../../../modules/inbox"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const notificationService = req.scope.resolve(INBOX_MODULE) as any
  const {
    limit: rawLimit,
    offset: rawOffset,
    unread,
  } = req.query as {
    limit?: string
    offset?: string
    unread?: string
  }

  const limit = Math.min(parseInt(rawLimit || "20", 10) || 20, 100)
  const offset = Math.max(parseInt(rawOffset || "0", 10) || 0, 0)
  const filters: Record<string, unknown> = { customer_id: customerId }

  if (unread === "true") {
    filters.read = false
  }

  const [notifications, count] = await notificationService.listAndCountNotifications(filters, {
    order: { created_at: "DESC" },
    take: limit,
    skip: offset,
  })

  const [, unread_count] = await notificationService.listAndCountNotifications({
    customer_id: customerId,
    read: false,
  })

  res.json({ notifications, count, unread_count })
}
