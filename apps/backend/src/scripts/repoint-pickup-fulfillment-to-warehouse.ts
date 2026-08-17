import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * One-off fix: all stock physically lives in a single warehouse regardless of
 * hand-off method (ship vs. pickup), but each pickup fulfillment set was
 * linked to its own dedicated (never-stocked) stock location. That location
 * has zero inventory_level rows, so every pickup fulfillment attempt fails
 * with "Inventory level ... not found".
 *
 * This repoints every fulfillment_set of type "pickup" to the Warehouse
 * stock location instead, single-sourcing inventory/fulfillment. The pickup's
 * own stock location is left untouched — it's still used for its distinct
 * address via the pickup_location module. Idempotent.
 */
export default async function repointPickupFulfillmentToWarehouse({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

  const locations = await stockLocationModule.listStockLocations({})
  const warehouse = locations.find((l: any) => l.name === "Hops & Glory Warehouse")
  if (!warehouse) {
    logger.error("No 'Hops & Glory Warehouse' stock location found — aborting")
    return
  }
  logger.info(`Using warehouse: ${warehouse.name} (${warehouse.id})`)

  const otherLocations = locations.filter((l: any) => l.id !== warehouse.id)
  const fulfillmentSets = await fulfillmentModule.listFulfillmentSets({ type: "pickup" })
  logger.info(`Found ${fulfillmentSets.length} pickup fulfillment set(s)`)

  for (const set of fulfillmentSets) {
    for (const loc of otherLocations) {
      try {
        await link.dismiss({
          [Modules.STOCK_LOCATION]: { stock_location_id: loc.id },
          [Modules.FULFILLMENT]: { fulfillment_set_id: set.id },
        })
        logger.info(`  "${set.name}": unlinked from ${loc.name} (${loc.id})`)
      } catch {
        // not linked to this location — expected for most (location, set) pairs
      }
    }

    try {
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: warehouse.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: set.id },
      })
      logger.info(`  "${set.name}": linked to warehouse (${warehouse.id})`)
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        logger.info(`  "${set.name}": already linked to warehouse`)
      } else {
        throw e
      }
    }
  }

  logger.info("Done.")
}
