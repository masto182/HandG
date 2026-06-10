import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows"
import type { ExecArgs } from "@medusajs/framework/types"

export default async function linkProductsToChannel({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const productModule = container.resolve(Modules.PRODUCT)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const inventoryModule = container.resolve(Modules.INVENTORY) as any

  const channels = await salesChannelModule.listSalesChannels({})
  if (!channels.length) {
    logger.error("No sales channels found — run seed.ts first")
    return
  }
  const sc = channels.find((c: any) => c.name === "Hops & Glory Store") || channels[0]
  logger.info(`Using sales channel: ${sc.name} (${sc.id})`)

  const locations = await stockLocationModule.listStockLocations({})
  let warehouse = locations.find((l: any) => l.name === "Hops & Glory Warehouse") || locations[0]
  if (!warehouse) {
    warehouse = await stockLocationModule.createStockLocations({
      name: "Hops & Glory Warehouse",
      address: {
        address_1: "123 Hop Lane",
        city: "Melbourne",
        country_code: "au",
        province: "VIC",
        postal_code: "3000",
      },
    })
    logger.info(`Created warehouse: ${warehouse.id}`)
  } else {
    logger.info(`Using warehouse: ${warehouse.name} (${warehouse.id})`)
  }

  const products = await productModule.listProducts({}, { select: ["id"] })
  logger.info(`Linking ${products.length} products to SC...`)
  let linked = 0
  let skipped = 0
  for (const product of products) {
    try {
      await link.create({
        [Modules.PRODUCT]: { product_id: product.id },
        [Modules.SALES_CHANNEL]: { sales_channel_id: sc.id },
      })
      linked++
    } catch (e: any) {
      if (e.message?.includes("already exists") || e.message?.includes("duplicate")) {
        skipped++
      } else {
        logger.warn(`SC link failed for ${product.id}: ${e.message}`)
      }
    }
  }
  logger.info(`SC links: ${linked} created, ${skipped} already existed`)

  const allItems = await inventoryModule.listInventoryItems({}, { relations: ["location_levels"] })
  const noLevels = allItems.filter((i: any) => !i.location_levels?.length)
  if (noLevels.length) {
    logger.info(
      `Creating placeholder qty=1 for ${noLevels.length} items with no inventory levels...`
    )
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: noLevels.map((i: any) => ({
          location_id: warehouse.id,
          inventory_item_id: i.id,
          stocked_quantity: 1,
        })),
      },
    })
    logger.info("Done — re-import CSV via admin Stock Import to set real quantities")
  } else {
    logger.info("All inventory items already have location levels")
  }
}
