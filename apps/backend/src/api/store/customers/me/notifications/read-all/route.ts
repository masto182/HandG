import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { markAllNotificationsReadWorkflow } from "../../../../../../workflows/manage-notification"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id

  const { result } = await markAllNotificationsReadWorkflow(req.scope).run({
    input: { customer_id: customerId },
  })

  res.json({ success: true, marked: (result as any).marked })
}
