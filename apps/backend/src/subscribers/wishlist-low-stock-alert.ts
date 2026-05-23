import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function wishlistLowStockAlert({ event, container }: SubscriberArgs<any>) {
  const productId = event.data.id
  const productModule = container.resolve(Modules.PRODUCT)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const wishlistService = container.resolve("wishlist") as any

  const [product] = await productModule.listProducts(
    { id: productId },
    { select: ["id", "title", "handle", "variants"], relations: ["variants"] }
  )

  if (!product) return

  const totalInventory = (product.variants || []).reduce((sum: number, v: any) => {
    return sum + (v.inventory_quantity ?? 0)
  }, 0)

  if (totalInventory <= 0) return

  const alerts = await wishlistService.listWishlists({
    product_id: productId,
    mode: "low_stock_alert",
  })

  if (alerts.length === 0) return

  for (const alert of alerts) {
    const threshold = alert.stock_threshold ?? 2
    if (totalInventory > threshold) continue

    try {
      const [customer] = await customerModule.listCustomers({ id: alert.customer_id })
      if (customer?.email) {
        console.log(`[Wishlist Low Stock] Notifying ${customer.email}: "${product.title}" has ${totalInventory} left (threshold: ${threshold})`)
      }
    } catch (err) {
      console.error(`[Wishlist Low Stock] Failed for ${alert.customer_id}:`, err)
    }
  }
}

export const config: SubscriberConfig = {
  event: "product.updated",
}
