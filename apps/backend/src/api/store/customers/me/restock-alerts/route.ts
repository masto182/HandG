import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VIP_SCORE_MODULE } from "../../../../../modules/vip-score"

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
  const restockAlertService = req.scope.resolve("restockAlert") as any
  const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any

  if (!beer_name || !brewery_name) {
    return res.status(400).json({ message: "beer_name and brewery_name are required" })
  }

  // Sprint 3: dedupe by product_id when provided. Falls back to (beer_name,
  // brewery_name) for ad-hoc subscriptions where the product isn't in our catalog.
  const dedupeFilter: Record<string, unknown> = {
    customer_id: customerId,
    notified_at: null,
  }
  if (product_id) {
    dedupeFilter.product_id = product_id
  } else {
    dedupeFilter.beer_name = beer_name
    dedupeFilter.brewery_name = brewery_name
  }

  const existing = await restockAlertService.listRestockAlerts(dedupeFilter)
  if (existing.length) {
    // 200 (not 201): existing resource returned, no new state created.
    return res.json({ restock_alert: existing[0] })
  }

  let vipTier = "approved"
  const scores = await vipScoreService.listVipScores({
    customer_id: customerId,
  })
  if (scores.length) {
    vipTier = scores[0].current_tier
  }

  // Sprint 3: call the service directly (workflow input shape didn't match the
  // model: it referenced variant_id/threshold/vip_tier columns that don't exist
  // and dropped the required beer_name/brewery_name fields).
  const alert = await restockAlertService.createRestockAlerts({
    customer_id: customerId,
    product_id: product_id || null,
    beer_name,
    brewery_name,
    tier_at_notification: vipTier,
  })

  res.status(201).json({ restock_alert: Array.isArray(alert) ? alert[0] : alert })
}

