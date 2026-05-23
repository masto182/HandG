import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import * as OrderPlacedTpl from "../emails/order-placed"
import * as OrderPaymentCapturedTpl from "../emails/order-payment-captured"

type Logger = {
  info: (msg: string) => void
  error: (msg: string) => void
}

async function resolvePayidAlias(container: any): Promise<string | undefined> {
  try {
    const svc = container.resolve("siteConfig") as {
      get: <T>(key: string) => Promise<T>
    }
    return await svc.get<string>("payid_alias")
  } catch {
    return undefined
  }
}

export default async function orderEmailHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger") as Logger
  const orderModule = container.resolve(Modules.ORDER)

  try {
    await refreshEmailConfig(container)
    const order = await orderModule.retrieveOrder(event.data.id, {
      relations: ["payment_collections.payments", "items"],
    } as any)
    if (!order?.email) {
      logger.info(
        `[Notification] Order ${event.data.id} has no email; skipping.`
      )
      return
    }

    const customerId = (order as any).customer_id || undefined
    const orderDisplayId = String(order.display_id ?? order.id)
    const storeUrl = getStoreUrl()

    if (event.name === "order.placed") {
      const items = ((order as any).items || []).map((it: any) => ({
        title: it.title || it.product_title || "Item",
        quantity: it.quantity || 1,
        unit_price: it.unit_price || 0,
      }))
      const total = (order as any).total ?? 0
      const currencyCode = (order as any).currency_code || "aud"
      const isPickup =
        ((order as any).shipping_methods || []).some(
          (sm: any) =>
            (sm.shipping_option?.name || sm.name || "")
              .toLowerCase()
              .includes("pickup")
        ) || false
      const payidAlias = await resolvePayidAlias(container)

      const result = await sendTemplate({
        to: order.email,
        customerId,
        category: "orders",
        template: OrderPlacedTpl,
        props: {
          name: (order as any).first_name || "Collector",
          orderDisplayId,
          items,
          total,
          currencyCode,
          isPickup,
          payidAlias,
          storeUrl,
        },
        container,
      })
      logger.info(
        `[Notification] order.placed email → ${order.email}: ${JSON.stringify(result)}`
      )
      return
    }

    if (event.name === "order.payment_captured") {
      const result = await sendTemplate({
        to: order.email,
        customerId,
        category: "orders",
        template: OrderPaymentCapturedTpl,
        props: {
          name: (order as any).first_name || "Collector",
          orderDisplayId,
          storeUrl,
        },
        container,
      })
      logger.info(
        `[Notification] order.payment_captured email → ${order.email}: ${JSON.stringify(result)}`
      )
      return
    }
  } catch (err) {
    logger.error(
      `[Notification] order email handler failed for ${event.data.id}: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: ["order.placed", "order.payment_captured"],
}
