import { Modules } from "@medusajs/framework/utils"
import { INBOX_MODULE } from "../../../../../modules/inbox"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../../../../../lib/email"
import * as WishlistPriceAlertTpl from "../../../../../emails/wishlist-price-alert"
import { getLowestVariantPrice } from "../../../../../lib/wishlist-price"

export async function checkPriceAlertImmediate(
  scope: any,
  wishlistItem: {
    id: string
    customer_id: string
    product_id: string
    target_price: number | null
    mode: string
    price_alert_sent?: boolean
  }
) {
  if (wishlistItem.mode !== "buy_at_price" || !wishlistItem.target_price) return
  if (wishlistItem.price_alert_sent) return

  const priced = await getLowestVariantPrice(scope, wishlistItem.product_id)
  if (!priced) return
  const { product, lowestPrice } = priced

  // Prices and target_price are both stored in dollars; compare directly.
  if (lowestPrice > wishlistItem.target_price) return

  const customerModule = scope.resolve(Modules.CUSTOMER)
  const notificationService = scope.resolve(INBOX_MODULE) as any
  const wishlistService = scope.resolve("wishlist") as any

  const [customer] = await customerModule.listCustomers({ id: wishlistItem.customer_id })
  if (!customer) return

  const currentPrice = `$${lowestPrice.toFixed(2)}`
  const targetPrice = `$${wishlistItem.target_price.toFixed(2)}`

  await notificationService.createNotifications({
    customer_id: wishlistItem.customer_id,
    type: "wishlist_match",
    title: `${product.title} hit your target price`,
    body: `Now ${currentPrice} — at or below your target of ${targetPrice}.`,
    metadata: {
      product_id: wishlistItem.product_id,
      handle: product.handle,
      current_price: lowestPrice,
      target_price: wishlistItem.target_price,
    },
  })

  if (customer.email) {
    await refreshEmailConfig(scope)
    const storeUrl = getStoreUrl()
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
      container: scope,
    })
  }

  await wishlistService.updateWishlists({ id: wishlistItem.id, price_alert_sent: true })
}
