import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ANALYTICS_MODULE } from "../../../modules/analytics"
import type { StoreEventRequest } from "./validators"

export async function POST(req: MedusaRequest<StoreEventRequest>, res: MedusaResponse) {
  const { event_type, session_id, payload, event_id } = req.validatedBody as StoreEventRequest & {
    event_id?: string
  }

  const analyticsService = req.scope.resolve(ANALYTICS_MODULE) as any

  await analyticsService.recordStorefrontEvent({
    event_type,
    session_id,
    customer_id: (req as any).auth_context?.actor_id ?? null,
    payload: payload ?? {},
    event_id: event_id ?? null,
  }) // workflow-exempt: telemetry ingestion, not a domain mutation — no rollback semantics, hot path

  return res.status(204).send()
}
