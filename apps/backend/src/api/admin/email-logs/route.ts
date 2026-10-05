import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EMAIL_LOG_MODULE } from "../../../modules/email-log"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const emailLogService = req.scope.resolve(EMAIL_LOG_MODULE) as any

  const { status, category, limit, offset } = req.query as Record<string, string>
  const filters: Record<string, unknown> = {}
  if (status) filters.status = status
  if (category) filters.category = category

  const parsedLimit = limit ? Number.parseInt(limit, 10) : NaN
  const parsedOffset = offset ? Number.parseInt(offset, 10) : NaN
  const take = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 50
  const skip = Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0

  const [logs, count] = await emailLogService.listAndCountEmailLogs(filters, {
    order: { sent_at: "DESC" },
    take,
    skip,
  })

  res.json({ logs, count })
}
