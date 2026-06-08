import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { INBOX_MODULE } from "../modules/notification"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import * as WishlistLowStockTpl from "../emails/wishlist-low-stock"

/**
 * Pure decision (unit-tested). Assumes totalInventory > 0 (full OOS handled
 * earlier). "send" = alert now; "reset" = clear the sent flag (stock recovered);
 * "skip" = nothing to do.
 */
export function decideLowStock(
  totalInventory: number,
  threshold: number,
  stockAlertSent: boolean
): "send" | "reset" | "skip" {
  if (totalInventory > threshold) {
    return stockAlertSent ? "reset" : "skip"
  }
  return stockAlertSent ? "skip" : "send"
}

/**
 * Notifies customers when a product on their wishlist (mode "buy_later") is
 * running low (0 < inventory <= stock_threshold). Idempotent via
 * stock_alert_sent; the flag resets once stock recovers above the threshold so
 * a future drop re-alerts.
 *
 * C6: previously filtered on mode "low_stock_alert" — a value nothing ever set
 * — so it never fired.
 */
export default async function wishlistLowStockAlert({ event, container }: SubscriberArgs<any>) {
  const productId = event.data.id
  const productModule = container.resolve(Modules.PRODUCT)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const wishlistService = container.resolve("wishlist") as any
  const notificationService = container.resolve(INBOX_MODULE) as any

  const [product] = await productModule.listProducts(
    { id: productId },
    { select: ["id", "title", "handle", "variants"], relations: ["variants"] }
  )

  if (!product) return

  const totalInventory = (product.variants || []).reduce((sum: number, v: any) => {
    return sum + (v.inventory_quantity ?? 0)
  }, 0)

  // Fully out of stock is a restock concern, not a low-stock one.
  if (totalInventory <= 0) return

  const items = await wishlistService.listWishlists({
    product_id: productId,
    mode: "buy_later",
  })

  if (items.length === 0) return

  await refreshEmailConfig(container)
  const storeUrl = getStoreUrl()

  for (const item of items) {
    const threshold = item.stock_threshold ?? 2
    const decision = decideLowStock(totalInventory, threshold, !!item.stock_alert_sent)

    if (decision === "reset") {
      await wishlistService.updateWishlists({ id: item.id, stock_alert_sent: false })
      continue
    }
    if (decision === "skip") continue

    try {
      const [customer] = await customerModule.listCustomers({ id: item.customer_id })
      if (!customer) continue

      await notificationService.createNotifications({
        customer_id: item.customer_id,
        type: "wishlist_match",
        title: `${product.title} is running low`,
        body: `Only ${totalInventory} left — below your threshold of ${threshold}.`,
        metadata: {
          product_id: productId,
          handle: product.handle,
          stock_remaining: totalInventory,
          threshold,
        },
      })

      if (customer.email) {
        await sendTemplate({
          to: customer.email,
          customerId: customer.id,
          category: "wishlist_offers",
          template: WishlistLowStockTpl,
          props: {
            name: customer.first_name || "Collector",
            beerName: product.title || "",
            stockRemaining: totalInventory,
            handle: product.handle || "",
            storeUrl,
          },
          container,
        })
      }

      await wishlistService.updateWishlists({ id: item.id, stock_alert_sent: true })
    } catch (err) {
      const logger = container.resolve("logger") as any
      logger.error(`[Wishlist Low Stock] Failed for ${item.customer_id}: ${err}`)
    }
  }
}

export const config: SubscriberConfig = {
  event: "product.updated",
}
