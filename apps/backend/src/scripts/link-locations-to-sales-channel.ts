import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function linkLocationsToSalesChannel({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)

  const locations = await stockLocationModule.listStockLocations({})
  const channels = await salesChannelModule.listSalesChannels({})

  const hgChannel = channels.find((c: any) => c.name === "Hops & Glory Store")
  if (!hgChannel) {
    logger.error("Hops & Glory Store sales channel not found!")
    return
  }

  logger.info(`Sales channel: ${hgChannel.name} (${hgChannel.id})`)
  logger.info(`Stock locations: ${locations.map((l: any) => l.name).join(", ")}`)

  for (const location of locations) {
    try {
      await link.create({
        [Modules.SALES_CHANNEL]: { sales_channel_id: hgChannel.id },
        [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      })
      logger.info(`  Linked "${location.name}" → "${hgChannel.name}"`)
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        logger.info(`  "${location.name}" already linked`)
      } else {
        logger.warn(`  Failed to link "${location.name}": ${e.message}`)
      }
    }
  }

  logger.info("\n=== DONE ===")
}
