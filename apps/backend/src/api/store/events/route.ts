import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ANALYTICS_MODULE } from "../../../modules/analytics"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { event_type, session_id, payload } = req.body as any

  if (!event_type || !session_id) {
    return res.status(400).json({ error: "event_type and session_id required" })
  }

  const analyticsService = req.scope.resolve(ANALYTICS_MODULE) as any

  const event = {
    event_type,
    session_id,
    customer_id: (req as any).auth_context?.actor_id ?? null,
    payload: payload ?? {},
  }

  await analyticsService.createStorefrontEvents([event]) // workflow-exempt: telemetry ingestion, not a domain mutation — no rollback semantics, hot path

  return res.status(204).send()
}
