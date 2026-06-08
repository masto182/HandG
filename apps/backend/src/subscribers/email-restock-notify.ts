import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * Detects a product going back in stock and stamps restock_detected_at on each
 * pending alert. It does NOT send emails — the restock-alert-dispatch cron is
 * the single send path and honours the tiered early-access ladder (vip5 first
 * ... approved last) measured from restock_detected_at.
 */
export default async function restockDetector({ event, container }: SubscriberArgs<any>) {
  const productId = event.data.id
  const productModule = container.resolve(Modules.PRODUCT)
  const restockAlertService = container.resolve("restockAlert") as any

  const [product] = await productModule.listProducts(
    { id: productId },
    { select: ["id"], relations: ["variants"] }
  )

  if (!product) return

  const totalInventory = (product.variants || []).reduce((sum: number, v: any) => {
    return sum + (v.inventory_quantity ?? 0)
  }, 0)

  if (totalInventory <= 0) return

  // Only stamp alerts that are pending (not notified) and not already detected.
  const alerts = await restockAlertService.listRestockAlerts({
    product_id: productId,
    notified_at: null,
    restock_detected_at: null,
  })

  if (alerts.length === 0) return

  const now = new Date()
  for (const alert of alerts) {
    try {
      await restockAlertService.updateRestockAlerts({
        id: alert.id,
        restock_detected_at: now,
      })
    } catch (err) {
      const logger = container.resolve("logger") as any
      logger.error(`[Restock] Failed to stamp detection for ${alert.id}: ${err}`)
    }
  }
}

export const config: SubscriberConfig = {
  event: "product.updated",
}
