import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function setLocationMetadata({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)

  const locations = await stockLocationModule.listStockLocations({})

  const metadataMap: Record<string, { opening_hours: string; display_name: string }> = {
    "Melbourne City": {
      opening_hours: "Tue\u2013Thu 9:30am\u20134pm. Other times via chat.",
      display_name: "Pickup \u2014 Melbourne CBD",
    },
    "Hillside Victoria": {
      opening_hours: "Mon & Fri 9am\u20137pm. Other times via chat.",
      display_name: "Pickup \u2014 Hillside",
    },
  }

  for (const loc of locations) {
    const meta = metadataMap[loc.name]
    if (!meta) continue

    await stockLocationModule.updateStockLocations(loc.id, {
      metadata: { ...((loc as any).metadata || {}), ...meta },
    })
    logger.info(`Updated ${loc.name} metadata: ${JSON.stringify(meta)}`)
  }

  logger.info("Done!")
}
