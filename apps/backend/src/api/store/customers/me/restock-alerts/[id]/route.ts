import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const { id } = req.params
  const restockAlertService = req.scope.resolve("restockAlert") as any

  // Verify ownership before deletion.
  const [alert] = await restockAlertService.listRestockAlerts({
    id,
    customer_id: customerId,
  })

  if (!alert) {
    return res.status(404).json({ message: "Restock alert not found" })
  }

  await restockAlertService.deleteRestockAlerts([id])
  res.json({ success: true, id, deleted: true })
}
