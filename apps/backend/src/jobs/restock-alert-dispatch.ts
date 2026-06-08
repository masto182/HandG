import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import * as RestockAvailableTpl from "../emails/restock-available"

/**
 * Tiered early-access ladder: hours to wait AFTER a restock is detected before
 * a customer of the given tier is notified. vip5/vip4 are notified first.
 */
export const TIER_DISPATCH_OFFSETS: Record<string, number> = {
  vip5: 0,
  vip4: 0,
  vip3: 12,
  vip2: 18,
  vip1: 23,
  approved: 24,
}

/** Pure decision helper (unit-tested): is this alert due to be sent now? */
export function shouldDispatch(
  tier: string | null | undefined,
  restockDetectedAt: Date | string | null | undefined,
  now: Date
): boolean {
  if (!restockDetectedAt) return false
  const offsetHours = TIER_DISPATCH_OFFSETS[tier || "approved"] ?? 24
  const detected = new Date(restockDetectedAt)
  const dispatchAt = new Date(detected.getTime() + offsetHours * 60 * 60 * 1000)
  return now.getTime() >= dispatchAt.getTime()
}

export default async function restockAlertDispatch(container: MedusaContainer) {
  const logger = container.resolve("logger") as any
  const restockAlertService = container.resolve("restockAlert") as any
  const productModule = container.resolve(Modules.PRODUCT)
  const customerModule = container.resolve(Modules.CUSTOMER)

  // Only alerts that have been detected back in stock but not yet notified.
  const alerts = await restockAlertService.listRestockAlerts({
    notified_at: null,
  })
  const pending = alerts.filter((a: any) => a.restock_detected_at)

  if (!pending.length) {
    logger.info("[Restock Alerts] No pending dispatches")
    return
  }

  await refreshEmailConfig(container)
  const storeUrl = getStoreUrl()
  const now = new Date()
  const handleCache = new Map<string, string>()
  let dispatched = 0

  for (const alert of pending) {
    if (!shouldDispatch(alert.tier_at_notification, alert.restock_detected_at, now)) {
      continue
    }
    try {
      const [customer] = await customerModule.listCustomers({ id: alert.customer_id })
      if (customer?.email) {
        let handle = ""
        if (alert.product_id) {
          if (handleCache.has(alert.product_id)) {
            handle = handleCache.get(alert.product_id)!
          } else {
            const [product] = await productModule.listProducts(
              { id: alert.product_id },
              { select: ["id", "handle"] }
            )
            handle = product?.handle || ""
            handleCache.set(alert.product_id, handle)
          }
        }
        await sendTemplate({
          to: customer.email,
          customerId: customer.id,
          category: "restock_alerts",
          template: RestockAvailableTpl,
          props: {
            name: customer.first_name || "Collector",
            beerName: alert.beer_name,
            breweryName: alert.brewery_name,
            handle,
            storeUrl,
          },
          container,
        })
      }
      await restockAlertService.updateRestockAlerts({ id: alert.id, notified_at: now })
      dispatched++
      logger.info(
        `[Restock Alerts] Dispatched: ${alert.beer_name} for ${alert.customer_id} (tier: ${alert.tier_at_notification})`
      )
    } catch (err) {
      logger.error(`[Restock Alerts] Failed to dispatch ${alert.id}: ${err}`)
    }
  }

  logger.info(`[Restock Alerts] Complete: ${dispatched} dispatched of ${pending.length} due`)
}

export const config = {
  name: "restock-alert-dispatch",
  schedule: "*/15 * * * *",
}
