import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { ALERT_DISPATCH_MODULE } from "../modules/alert-dispatch"

export default async function orderAlertAttribution({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderModule = container.resolve(Modules.ORDER) as any
  const dispatchService = container.resolve(ALERT_DISPATCH_MODULE) as any
  const logger = container.resolve("logger") as any

  try {
    const order = await orderModule.retrieveOrder(event.data.id, {
      relations: ["items"],
    } as any)
    if (!order) return

    const customerId = order.customer_id
    if (!customerId) return

    const productIds: string[] = ((order as any).items || [])
      .map((it: any) => it.product_id || it.variant?.product_id)
      .filter(Boolean)

    if (productIds.length === 0) return

    const dispatches = await dispatchService.listAlertDispatches({
      customer_id: customerId,
    })

    const now = new Date()
    for (const d of dispatches) {
      if (d.ordered_at) continue
      if (!productIds.includes(d.product_id)) continue
      await dispatchService.updateAlertDispatches({
        id: d.id,
        ordered_at: now,
        order_id: order.id,
      })
    }
  } catch (err) {
    logger.error(`[AlertAttribution] Failed for order ${event.data.id}: ${err}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
