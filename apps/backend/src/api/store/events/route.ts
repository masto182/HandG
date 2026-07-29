import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ANALYTICS_MODULE } from "../../../modules/analytics"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { event_type, session_id, payload } = req.body as any

  if (!event_type || !session_id) {
    return res.status(400).json({ error: "event_type and session_id required" })
  }

  const analyticsService = req.scope.resolve(ANALYTICS_MODULE) as any

  await analyticsService.createStorefrontEvents([
    {
      event_type,
      session_id,
      customer_id: (req as any).auth_context?.actor_id ?? null,
      payload: payload ?? {},
    },
  ])

  return res.status(204).send()
}
