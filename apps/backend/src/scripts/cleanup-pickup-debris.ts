import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * One-off cleanup (idempotent, safe to re-run) for debris left behind by the
 * seed.ts / admin-module pickup-location desync (see fix-pickup-locations.ts
 * for the data-alignment half of this fix):
 *
 * 1. Deletes any "pickup" type fulfillment_set that has zero service zones —
 *    these are dead admin-created sets (e.g. "Downtown Pickup pick up") that
 *    were never wired up with a shipping option and can't affect checkout.
 * 2. Deletes stock_location rows named exactly "Downtown Pickup" or
 *    "Suburb Pickup" (the old seed placeholder names) that are NOT
 *    referenced by any pickup_location row — i.e. orphaned duplicates
 *    created when seed re-ran after an admin rename. Unlinks any
 *    sales_channel_stock_location link first.
 *
 * Run via: npx medusa exec ./src/scripts/cleanup-pickup-debris.ts
 */

export default async function cleanupPickupDebris({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const pickupSvc = container.resolve("pickupLocation") as any

  // ---------------------------------------------------------------------
  // 1. Dead pickup fulfillment sets (zero service zones)
  // ---------------------------------------------------------------------
  const pickupSets = await fulfillmentModule.listFulfillmentSets(
    { type: "pickup" },
    { relations: ["service_zones"] }
  )
  for (const fs of pickupSets as any[]) {
    if ((fs.service_zones?.length ?? 0) > 0) {
      logger.info(`  Keeping "${fs.name}" (${fs.service_zones.length} zone(s))`)
      continue
    }
    // Dismiss any location links before deleting the set.
    const locations = await stockLocationModule.listStockLocations({})
    for (const loc of locations as any[]) {
      try {
        await link.dismiss({
          [Modules.STOCK_LOCATION]: { stock_location_id: loc.id },
          [Modules.FULFILLMENT]: { fulfillment_set_id: fs.id },
        })
      } catch {
        // not linked to this location — fine
      }
    }
    await fulfillmentModule.deleteFulfillmentSets(fs.id)
    logger.info(`  Deleted dead fulfillment set "${fs.name}" (${fs.id})`)
  }

  // ---------------------------------------------------------------------
  // 2. Orphaned duplicate pickup stock locations (old placeholder names,
  //    no longer referenced by any pickup_location row)
  // ---------------------------------------------------------------------
  const placeholderNames = ["Downtown Pickup", "Suburb Pickup"]
  const candidates = await stockLocationModule.listStockLocations({
    name: placeholderNames,
  })
  const activePickupLocations = await pickupSvc.listPickupLocations({})
  const referencedIds = new Set(activePickupLocations.map((p: any) => p.stock_location_id))

  for (const loc of candidates as any[]) {
    if (referencedIds.has(loc.id)) {
      logger.info(`  Keeping stock_location "${loc.name}" (${loc.id}) — still referenced`)
      continue
    }

    const channels = await salesChannelModule.listSalesChannels({})
    for (const ch of channels as any[]) {
      try {
        await link.dismiss({
          [Modules.SALES_CHANNEL]: { sales_channel_id: ch.id },
          [Modules.STOCK_LOCATION]: { stock_location_id: loc.id },
        })
        logger.info(`  Unlinked "${loc.name}" from sales channel "${ch.name}"`)
      } catch {
        // not linked — fine
      }
    }

    await stockLocationModule.deleteStockLocations(loc.id)
    logger.info(`  Deleted orphaned duplicate stock_location "${loc.name}" (${loc.id})`)
  }

  logger.info("cleanup-pickup-debris complete.")
}
