import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ANALYTICS_MODULE } from "../../../../modules/analytics"
import type { SessionHeartbeatRequest } from "./validators"

export async function POST(req: MedusaRequest<SessionHeartbeatRequest>, res: MedusaResponse) {
  const { session_id, path, referrer } = req.validatedBody

  const analyticsService = req.scope.resolve(ANALYTICS_MODULE) as any

  await analyticsService.upsertSession({
    session_id,
    customer_id: (req as any).auth_context?.actor_id ?? null,
    path: path ?? null,
    referrer: referrer ?? null,
  }) // workflow-exempt: telemetry heartbeat, not a domain mutation — no rollback semantics, hot path

  return res.status(204).send()
}
