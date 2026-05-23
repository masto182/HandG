import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import * as RestockAvailableTpl from "../emails/restock-available"

export default async function restockNotifier({ event, container }: SubscriberArgs<any>) {
  const productId = event.data.id
  const productModule = container.resolve(Modules.PRODUCT)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const restockAlertService = container.resolve("restockAlert") as any

  const [product] = await productModule.listProducts(
    { id: productId },
    { select: ["id", "title", "handle", "variants"], relations: ["variants"] }
  )

  if (!product) return

  const totalInventory = (product.variants || []).reduce((sum: number, v: any) => {
    return sum + (v.inventory_quantity ?? 0)
  }, 0)

  if (totalInventory <= 0) return

  const alerts = await restockAlertService.listRestockAlerts({
    product_id: productId,
    notified_at: null,
  })

  if (alerts.length === 0) return

  // Read site config once before the per-alert loop (not per-row).
  await refreshEmailConfig(container)
  const storeUrl = getStoreUrl()

  for (const alert of alerts) {
    try {
      const [customer] = await customerModule.listCustomers({ id: alert.customer_id })
      if (customer?.email) {
        await sendTemplate({
          to: customer.email,
          customerId: customer.id,
          category: "restock_alerts",
          template: RestockAvailableTpl,
          props: {
            name: customer.first_name || "Collector",
            beerName: alert.beer_name,
            breweryName: alert.brewery_name,
            handle: product.handle || "",
            storeUrl,
          },
          container,
        })
      }
      await restockAlertService.updateRestockAlerts(alert.id, {
        notified_at: new Date(),
      })
    } catch (err) {
      console.error(`[Restock] Failed to notify ${alert.customer_id}:`, err)
    }
  }
}

export const config: SubscriberConfig = {
  event: "product.updated",
}
