import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import * as OrderShippedTpl from "../emails/order-shipped"

type Logger = {
  info: (msg: string) => void
  error: (msg: string) => void
}

/**
 * Listens for shipment.created (FulfillmentWorkflowEvents.SHIPMENT_CREATED).
 * Payload: { id: <fulfillment_id>, no_notification: boolean }.
 * Looks up the order via order_fulfillment link and sends the shipped email.
 */
export default async function orderShippedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  const logger = container.resolve("logger") as Logger
  if (event.data.no_notification) return

  try {
    await refreshEmailConfig(container)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

    const fulfillment = await fulfillmentModule.retrieveFulfillment(
      event.data.id
    )

    // Resolve the order id via the order ↔ fulfillment link
    const { data: links } = await query.graph({
      entity: "order_fulfillment",
      fields: ["order_id"],
      filters: { fulfillment_id: event.data.id } as any,
    })
    const orderId = (links?.[0] as any)?.order_id
    if (!orderId) {
      logger.info(
        `[Notification] shipment.created ${event.data.id}: no linked order`
      )
      return
    }

    const orderModule = container.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId)
    if (!order?.email) return

    const labels = (fulfillment as any).labels || []
    const trackingNumber = labels[0]?.tracking_number
    const trackingUrl = labels[0]?.url
    const carrier = (fulfillment as any).provider_id

    const result = await sendTemplate({
      to: order.email,
      customerId: (order as any).customer_id,
      category: "orders",
      template: OrderShippedTpl,
      props: {
        name: (order as any).first_name || "Collector",
        orderDisplayId: String(order.display_id ?? order.id),
        carrier,
        trackingNumber,
        trackingUrl,
        storeUrl: getStoreUrl(),
      },
      container,
    })
    logger.info(
      `[Notification] order shipped → ${order.email}: ${JSON.stringify(result)}`
    )
  } catch (err) {
    logger.error(
      `[Notification] shipment.created handler failed for ${event.data.id}: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
