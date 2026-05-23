import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function linkFulfilment({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

  const locations = await stockLocationModule.listStockLocations({})
  const warehouse = locations.find((l) => l.name === "Hops & Glory Warehouse")!
  const melbCity = locations.find((l) => l.name === "Melbourne City")!
  const hillside = locations.find((l) => l.name === "Hillside Victoria")!

  const sets = await fulfillmentModule.listFulfillmentSets({})
  const shippingSet = sets.find((s) => s.type === "shipping")!
  const pickupMelb = sets.find((s) => s.name === "Pickup - Melbourne City")!
  const pickupHillside = sets.find((s) => s.name === "Pickup - Hillside Victoria")!

  const [salesChannel] = await salesChannelModule.listSalesChannels({ name: "Hops & Glory Store" })
  if (!salesChannel) {
    const [sc] = await salesChannelModule.listSalesChannels({})
    logger.info(`No 'Hops & Glory Store' found. Using: ${sc?.name} (${sc?.id})`)
  }
  const sc = salesChannel || (await salesChannelModule.listSalesChannels({}))[0]

  logger.info("Creating stock_location <-> fulfillment_set links...")

  const locationSetLinks = [
    { stockLocationId: warehouse.id, fulfillmentSetId: shippingSet.id },
    { stockLocationId: melbCity.id, fulfillmentSetId: pickupMelb.id },
    { stockLocationId: hillside.id, fulfillmentSetId: pickupHillside.id },
  ]

  for (const { stockLocationId, fulfillmentSetId } of locationSetLinks) {
    try {
      await remoteLink.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
        [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSetId },
      })
      logger.info(`  Linked loc ${stockLocationId} → set ${fulfillmentSetId}`)
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        logger.info(`  Link already exists: loc ${stockLocationId} → set ${fulfillmentSetId}`)
      } else {
        logger.error(`  Failed: ${e.message}`)
      }
    }
  }

  logger.info("\nCreating sales_channel <-> stock_location links...")

  for (const loc of [warehouse, melbCity, hillside]) {
    try {
      await remoteLink.create({
        [Modules.SALES_CHANNEL]: { sales_channel_id: sc.id },
        [Modules.STOCK_LOCATION]: { stock_location_id: loc.id },
      })
      logger.info(`  Linked SC ${sc.id} → loc ${loc.id} (${loc.name})`)
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        logger.info(`  Link already exists: SC → ${loc.name}`)
      } else {
        logger.error(`  Failed: ${e.message}`)
      }
    }
  }

  logger.info("\nDone! Pickup and delivery options should now appear in the Store API.")
}
