import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createRestockAlertWorkflow } from "../../../../../workflows/manage-restock-alert"
import { VIP_SCORE_MODULE } from "../../../../../modules/vip-score"
import evaluateVipProgressionWorkflow from "../../../../../workflows/evaluate-vip-progression"
import { ONBOARDING_STEPS } from "../../../../../modules/vip-score/onboarding-steps"

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

  // Dedupe, VIP-tier capture, and create all happen inside the workflow step.
  const { result } = await createRestockAlertWorkflow(req.scope).run({
    input: { customer_id: customerId, product_id: product_id || null, beer_name, brewery_name },
  })

  // 201 when a new alert was created; 200 when an existing one was returned.
  if (result.created) {
    const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
    const step = ONBOARDING_STEPS.restock_alert
    vipScoreService
      .addOnboardingBonus(customerId, "restock_alert", step.points)
      .then(({ inserted }: { inserted: boolean }) => {
        if (inserted)
          evaluateVipProgressionWorkflow(req.scope)
            .run({ input: { customer_id: customerId } })
            .catch(() => {})
      })
      .catch(() => {})
  }

  res.status(result.created ? 201 : 200).json({ restock_alert: result.alert })
}
