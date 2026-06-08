import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { INBOX_MODULE } from "../modules/notification"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import * as WishlistPriceAlertTpl from "../emails/wishlist-price-alert"
import { getLowestVariantPrice } from "../lib/wishlist-price"

/**
 * Fires when a product changes (e.g. an admin drops the price) and notifies
 * customers whose buy_at_price target is now met. Uses the pricing module via
 * getLowestVariantPrice — the previous version read variant.prices (always
 * undefined) and never fired.
 */
export default async function wishlistPriceAlert({ event, container }: SubscriberArgs<any>) {
  const productId = event.data.id
  const customerModule = container.resolve(Modules.CUSTOMER)
  const wishlistService = container.resolve("wishlist") as any
  const notificationService = container.resolve(INBOX_MODULE) as any

  const priced = await getLowestVariantPrice(container, productId)
  if (!priced) return
  const { product, lowestPrice } = priced

  const pricePointItems = await wishlistService.listWishlists({
    product_id: productId,
    mode: "buy_at_price",
    price_alert_sent: false,
  })

  if (pricePointItems.length === 0) return

  await refreshEmailConfig(container)
  const storeUrl = getStoreUrl()

  for (const item of pricePointItems) {
    // Prices and target_price are both in dollars; compare directly.
    if (!item.target_price || lowestPrice > item.target_price) continue

    try {
      const [customer] = await customerModule.listCustomers({ id: item.customer_id })
      if (!customer) continue

      const currentPrice = `$${lowestPrice.toFixed(2)}`
      const targetPrice = `$${item.target_price.toFixed(2)}`

      await notificationService.createNotifications({
        customer_id: item.customer_id,
        type: "wishlist_match",
        title: `${product.title} hit your target price`,
        body: `Now ${currentPrice} — at or below your target of ${targetPrice}.`,
        metadata: {
          product_id: productId,
          handle: product.handle,
          current_price: lowestPrice,
          target_price: item.target_price,
        },
      })

      if (customer.email) {
        await sendTemplate({
          to: customer.email,
          customerId: customer.id,
          category: "wishlist_offers",
          template: WishlistPriceAlertTpl,
          props: {
            name: customer.first_name || "Collector",
            beerName: product.title || "",
            currentPrice,
            targetPrice,
            handle: product.handle || "",
            storeUrl,
          },
          container,
        })
      }

      await wishlistService.updateWishlists({ id: item.id, price_alert_sent: true })
    } catch (err) {
      const logger = container.resolve("logger") as any
      logger.error(`[Wishlist Price] Failed for ${item.customer_id}: ${err}`)
    }
  }
}

export const config: SubscriberConfig = {
  event: "product.updated",
}
