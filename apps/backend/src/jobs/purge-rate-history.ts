import { MedusaContainer } from "@medusajs/framework/types"
import { SHIPPING_RATE_HISTORY_MODULE } from "../modules/shipping-rate-history"
import type ShippingRateHistoryModuleService from "../modules/shipping-rate-history/service"

const RETENTION_DAYS = 90

/**
 * Deletes shipping_rate_history rows older than RETENTION_DAYS to prevent
 * unbounded table growth. Runs weekly; at ~100 cart sessions/day the table
 * would accumulate ~36k rows/year without purging.
 */
export default async function purgeRateHistory(container: MedusaContainer) {
  const logger = container.resolve("logger") as {
    info: (msg: string) => void
    warn: (msg: string) => void
    error: (msg: string) => void
  }

  const svc = container.resolve(SHIPPING_RATE_HISTORY_MODULE) as ShippingRateHistoryModuleService

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  let deleted = 0
  const batchSize = 500

  try {
    while (true) {
      const old = await (svc as any).listShippingRateHistories(
        { sampled_at: { $lt: cutoff.toISOString() } },
        { select: ["id"], take: batchSize }
      )
      if (!old.length) break

      const ids = old.map((r: any) => r.id)
      await (svc as any).deleteShippingRateHistories(ids)
      deleted += ids.length

      if (ids.length < batchSize) break
    }

    logger.info(`[purge-rate-history] deleted ${deleted} records older than ${RETENTION_DAYS} days`)
  } catch (err: any) {
    logger.error(`[purge-rate-history] error: ${err?.message}`)
  }
}

export const config = {
  name: "purge-rate-history",
  // Weekly on Sunday at 03:00 UTC.
  schedule: "0 3 * * 0",
}
