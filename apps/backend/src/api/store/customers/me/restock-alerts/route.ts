import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createRestockAlertWorkflow } from "../../../../../workflows/manage-restock-alert"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const productId = (req.query.product_id as string) || undefined
  const restockAlertService = req.scope.resolve("restockAlert") as any

  const filter: Record<string, unknown> = {
    customer_id: customerId,
    notified_at: null,
  }
  if (productId) {
    filter.product_id = productId
  }

  const alerts = await restockAlertService.listRestockAlerts(filter)

  res.json({ restock_alerts: alerts })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const { product_id, beer_name, brewery_name } = req.body as {
    product_id?: string
    beer_name: string
    brewery_name: string
  }

  if (!beer_name || !brewery_name) {
    return res.status(400).json({ message: "beer_name and brewery_name are required" })
  }

  const { result } = await createRestockAlertWorkflow(req.scope).run({
    input: { customer_id: customerId, product_id: product_id || null, beer_name, brewery_name },
  })

  res.status(result.created ? 201 : 200).json({ restock_alert: result.alert })
}
