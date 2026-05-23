import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import { SITE_CONFIG_MODULE } from "../modules/site-config"
import type SiteConfigModuleService from "../modules/site-config/service"

const DEFAULT_PAYID_HOLD_HOURS = 24
const HOURS_IN_MS = 60 * 60 * 1000

type Logger = {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

/**
 * Cancels PayID orders that have been sitting with an unpaid payment session
 * for more than PAYID_HOLD_HOURS. PayID is a manual bank transfer so orders
 * can remain in authorized/pending state indefinitely otherwise. This job is
 * the counterpart to the 24h reservation promise shown on the storefront.
 */
export default async function cancelUnpaidPayidOrders(container: MedusaContainer) {
  const logger = container.resolve("logger") as Logger
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // Resolve hold window once per job run (NOT per order — keep cheap).
  let holdHours = DEFAULT_PAYID_HOLD_HOURS
  try {
    const siteConfig = container.resolve(SITE_CONFIG_MODULE) as SiteConfigModuleService
    holdHours = await siteConfig.get<number>("payid_hold_hours")
  } catch {}

  const cutoff = new Date(Date.now() - holdHours * HOURS_IN_MS)

  let offset = 0
  const limit = 100
  let scanned = 0
  let cancelled = 0
  const workflow = cancelOrderWorkflow(container)

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "status",
        "canceled_at",
        "created_at",
        "payment_status",
        "payment_collections.payments.provider_id",
        "payment_collections.payments.captured_at",
      ],
      filters: {
        created_at: { $lt: cutoff.toISOString() },
      },
      pagination: { skip: offset, take: limit } as any,
    })

    if (!orders?.length) break

    for (const order of orders as any[]) {
      if (order.canceled_at) continue
      if (order.payment_status === "captured") continue

      const payments = (order.payment_collections || [])
        .flatMap((pc: any) => pc?.payments || [])
        .filter(Boolean)

      const hasPayId = payments.some((p: any) =>
        typeof p.provider_id === "string" && p.provider_id.startsWith("pp_payid")
      )
      if (!hasPayId) continue

      const anyCaptured = payments.some((p: any) => p.captured_at)
      if (anyCaptured) continue

      try {
        await workflow.run({ input: { order_id: order.id, no_notification: false } })
        cancelled += 1
        logger.info(
          `[PayID Expiry] Cancelled order ${order.id} (created ${order.created_at}) after ${holdHours}h unpaid.`
        )
      } catch (err) {
        logger.error(
          `[PayID Expiry] Failed to cancel ${order.id}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    scanned += orders.length
    offset += orders.length
    if (orders.length < limit) break
  }

  logger.info(
    `[PayID Expiry] Scan complete: scanned=${scanned} cancelled=${cancelled} cutoff=${cutoff.toISOString()}`
  )
}

export const config = {
  name: "cancel-unpaid-payid-orders",
  // Every 15 minutes.
  schedule: "*/15 * * * *",
}
