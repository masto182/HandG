import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
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

async function resolveSiteConfigValues(
  container: any
): Promise<{ holdHours: number; ordersEmail: string }> {
  const defaults = { holdHours: 24, ordersEmail: "orders@hopsandglory.au" }
  try {
    const svc = container.resolve("siteConfig") as {
      get: <T>(key: string) => Promise<T>
    }
    const [holdHours, ordersEmail] = await Promise.all([
      svc.get<number>("payid_hold_hours").catch(() => defaults.holdHours),
      svc.get<string>("email_orders_to").catch(() => defaults.ordersEmail),
    ])
    return { holdHours, ordersEmail }
  } catch {
    return defaults
  }
}

export default async function orderEmailHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger") as Logger
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    await refreshEmailConfig(container)
    // `total` is a computed getter that reads from the order's `summary`
    // relation. Requesting `items.*` in the SAME query.graph call as `total`
    // breaks that getter's hydration and it silently resolves to 0 — so fetch
    // totals/relations and items in two separate calls and merge.
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "email",
        "display_id",
        "customer_id",
        "customer.first_name",
        "shipping_address.first_name",
        "billing_address.first_name",
        "total",
        "currency_code",
        "shipping_methods.name",
        "payment_collections.payments.provider_id",
      ],
      filters: { id: event.data.id },
    })
    const order = orders[0] as any
    if (!order?.email) {
      logger.info(`[Notification] Order ${event.data.id} has no email; skipping.`)
      return
    }

    const { data: withItems } = await query.graph({
      entity: "order",
      fields: ["id", "items.title", "items.product_title", "items.quantity", "items.unit_price"],
      filters: { id: order.id },
    })
    order.items = (withItems[0] as any)?.items || []

    const customerId = order.customer_id || undefined
    const orderDisplayId = String(order.display_id ?? order.id)
    const storeUrl = getStoreUrl()
    const firstName =
      order.customer?.first_name ||
      order.shipping_address?.first_name ||
      order.billing_address?.first_name ||
      "Collector"

    if (event.name === "order.placed") {
      const items = (order.items || []).map((it: any) => ({
        title: it.title || it.product_title || "Item",
        quantity: it.quantity || 1,
        unit_price: it.unit_price || 0,
      }))
      const total = Number(order.total ?? 0) || 0
      const currencyCode = order.currency_code || "aud"
      const isPickup =
        (order.shipping_methods || []).some((sm: any) =>
          (sm.name || "").toLowerCase().includes("pickup")
        ) || false

      const payments = (order.payment_collections || []).flatMap((pc: any) => pc?.payments || [])
      const isCash = payments.some(
        (p: any) =>
          typeof p.provider_id === "string" && p.provider_id.startsWith("pp_system_default")
      )
      const isPayId = payments.some(
        (p: any) => typeof p.provider_id === "string" && p.provider_id.startsWith("pp_payid")
      )

      const payidAlias = isPayId ? await resolvePayidAlias(container) : undefined
      const { holdHours, ordersEmail } = await resolveSiteConfigValues(container)

      const result = await sendTemplate({
        to: order.email,
        customerId,
        category: "orders",
        template: OrderPlacedTpl,
        props: {
          name: firstName,
          orderDisplayId,
          items,
          total,
          currencyCode,
          isPickup,
          isCash,
          payidAlias,
          holdHours,
          ordersEmail,
          storeUrl,
        },
        container,
      })
      logger.info(`[Notification] order.placed email → ${order.email}: ${JSON.stringify(result)}`)
      return
    }

    if (event.name === "order.payment_captured") {
      const result = await sendTemplate({
        to: order.email,
        customerId,
        category: "orders",
        template: OrderPaymentCapturedTpl,
        props: {
          name: firstName,
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
