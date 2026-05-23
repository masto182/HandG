import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function wishlistPriceAlert({ event, container }: SubscriberArgs<any>) {
  const productId = event.data.id
  const productModule = container.resolve(Modules.PRODUCT)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const wishlistService = container.resolve("wishlist") as any

  const [product] = await productModule.listProducts(
    { id: productId },
    { select: ["id", "title", "handle", "variants"], relations: ["variants"] }
  )

  if (!product || !product.variants?.length) return

  const lowestPrice = product.variants.reduce((min: number, v: any) => {
    const prices = v.prices || []
    for (const p of prices) {
      const amount = p.amount ?? Infinity
      if (amount < min) min = amount
    }
    return min
  }, Infinity)

  if (lowestPrice === Infinity) return

  const pricePointItems = await wishlistService.listWishlists({
    product_id: productId,
    mode: "buy_at_price",
    price_alert_sent: false,
  })

  if (pricePointItems.length === 0) return

  for (const item of pricePointItems) {
    if (!item.target_price || lowestPrice > item.target_price) continue

    try {
      const [customer] = await customerModule.listCustomers({ id: item.customer_id })
      if (customer?.email) {
        console.log(`[Wishlist Price Alert] Notifying ${customer.email}: "${product.title}" now at $${lowestPrice / 100} (target: $${item.target_price / 100})`)
      }
      await wishlistService.updateWishlists({ id: item.id, price_alert_sent: true })
    } catch (err) {
      console.error(`[Wishlist Price] Failed for ${item.customer_id}:`, err)
    }
  }
}

export const config: SubscriberConfig = {
  event: "product.updated",
}
