/**
 * Smoke-test helper: stamps restock_detected_at = now on all pending alerts
 * for a given product. Used by scripts/smoke/restock-alerts.sh to reliably
 * trigger the dispatch path without depending on the subscriber's inventory
 * check (which reads inventory_quantity from the product module — a field
 * that may not be populated in all Medusa v2 query paths).
 *
 * Usage:
 *   SMOKE_PRODUCT_ID=prod_xxx npx medusa exec ./src/scripts/smoke-restock-stamp.ts
 */
import { MedusaContainer } from "@medusajs/framework/types"

export default async function smokeRestockStamp(container: MedusaContainer) {
  const logger = container.resolve("logger") as any
  const restockAlertService = container.resolve("restockAlert") as any

  const productId = process.env.SMOKE_PRODUCT_ID
  if (!productId) {
    logger.error("[smoke-restock-stamp] SMOKE_PRODUCT_ID env var is required")
    process.exit(1)
  }

  const alerts = await restockAlertService.listRestockAlerts({
    product_id: productId,
    notified_at: null,
    restock_detected_at: null,
  })

  if (alerts.length === 0) {
    logger.info(`[smoke-restock-stamp] No pending alerts for ${productId}`)
    return
  }

  const now = new Date()
  for (const alert of alerts) {
    await restockAlertService.updateRestockAlerts({
      id: alert.id,
      restock_detected_at: now,
    })
    logger.info(`[smoke-restock-stamp] Stamped detection on ${alert.id}`)
  }

  logger.info(`[smoke-restock-stamp] Stamped ${alerts.length} alert(s)`)
}
