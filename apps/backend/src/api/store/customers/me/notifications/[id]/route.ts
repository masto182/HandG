import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deleteNotificationWorkflow } from "../../../../../../workflows/manage-notification"

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const { id } = req.params

  await deleteNotificationWorkflow(req.scope).run({
    input: { id, customer_id: customerId },
  })

  res.json({ success: true, id })
}
