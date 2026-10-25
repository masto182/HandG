import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import * as OrderDeliveredTpl from "../emails/order-delivered"

type Logger = {
  info: (msg: string) => void
  error: (msg: string) => void
}

const MAX_DELIVERY_AGE_MS = 3 * 24 * 60 * 60 * 1000

/**
 * Listens for delivery.created (FulfillmentWorkflowEvents.DELIVERY_CREATED).
 * Payload: { id: <fulfillment_id>, no_notification?: boolean }.
 * Only emails for carrier-tracked (ShipEngine) fulfilments, never for
 * backfilled ones, and never when the carrier's delivery scan is stale.
 */
export default async function orderDeliveredHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  const logger = container.resolve("logger") as Logger
  if (event.data.no_notification) return

  try {
    const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
    const fulfillment = (await fulfillmentModule.retrieveFulfillment(event.data.id)) as any

    if (!String(fulfillment?.provider_id ?? "").startsWith("shipengine")) return
    const meta = fulfillment.metadata ?? {}
    if (meta.tracking_backfill) return
    const scannedAt = meta.delivered_at ? Date.parse(meta.delivered_at) : NaN
    if (!Number.isNaN(scannedAt) && Date.now() - scannedAt > MAX_DELIVERY_AGE_MS) {
      logger.info(`[Notification] delivery.created ${event.data.id}: stale scan, skipping email`)
      return
    }

    await refreshEmailConfig(container)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: links } = await query.graph({
      entity: "order_fulfillment",
      fields: ["order_id"],
      filters: { fulfillment_id: event.data.id } as any,
    })
    const orderId = (links?.[0] as any)?.order_id
    if (!orderId) return

    const orderModule = container.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId)
    if (!order?.email) return

    const result = await sendTemplate({
      to: order.email,
      customerId: (order as any).customer_id,
      category: "orders",
      template: OrderDeliveredTpl,
      props: {
        name: (order as any).first_name || "Collector",
        orderDisplayId: String(order.display_id ?? order.id),
        storeUrl: getStoreUrl(),
      },
      container,
    })
    logger.info(`[Notification] order delivered → ${order.email}: ${JSON.stringify(result)}`)
  } catch (err) {
    logger.error(
      `[Notification] delivery.created handler failed for ${event.data.id}: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}
