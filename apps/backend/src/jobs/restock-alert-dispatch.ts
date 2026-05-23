import { MedusaContainer } from "@medusajs/framework/types"

const TIER_DISPATCH_OFFSETS: Record<string, number> = {
  vip5: 0,
  vip4: 0,
  vip3: 12,
  vip2: 18,
  vip1: 23,
  approved: 24,
}

export default async function restockAlertDispatch(container: MedusaContainer) {
  const logger = container.resolve("logger") as any
  const restockAlertService = container.resolve("restockAlert") as any

  logger.info("[Restock Alerts] Checking for pending dispatches...")

  const alerts = await restockAlertService.listRestockAlerts({
    notified_at: null,
  })

  if (!alerts.length) {
    logger.info("[Restock Alerts] No pending alerts")
    return
  }

  let dispatched = 0
  const now = new Date()

  for (const alert of alerts) {
    const tier = alert.tier_at_notification || "approved"
    const offsetHours = TIER_DISPATCH_OFFSETS[tier] ?? 24

    const createdAt = new Date(alert.created_at)
    const dispatchAt = new Date(createdAt.getTime() + offsetHours * 60 * 60 * 1000)

    if (now >= dispatchAt) {
      await restockAlertService.updateRestockAlerts(alert.id, {
        notified_at: now,
      })
      dispatched++
      logger.info(
        `[Restock Alerts] Dispatched: ${alert.beer_name} for customer ${alert.customer_id} (tier: ${tier})`
      )
    }
  }

  logger.info(`[Restock Alerts] Complete: ${dispatched} dispatched out of ${alerts.length} pending`)
}

export const config = {
  name: "restock-alert-dispatch",
  schedule: "*/15 * * * *",
}
