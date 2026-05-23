import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const notificationService = req.scope.resolve("notification") as any

  const notifications = await notificationService.listNotifications(
    { customer_id: customerId },
    { order: { created_at: "DESC" }, take: 50 }
  )

  res.json({ notifications })
}
