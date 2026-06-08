import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { markNotificationReadWorkflow } from "../../../../../../workflows/manage-notification"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const { ids } = req.body as { ids?: string[] }

  if (ids && ids.length > 0) {
    for (const id of ids) {
      await markNotificationReadWorkflow(req.scope).run({
        input: { id, customer_id: customerId },
      })
    }
  }

  res.json({ success: true })
}
