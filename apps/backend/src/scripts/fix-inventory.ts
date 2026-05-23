import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function fixInventory({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const inventoryModule = container.resolve(Modules.INVENTORY)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const productModule = container.resolve(Modules.PRODUCT)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const locations = await stockLocationModule.listStockLocations({})
  logger.info(`Stock locations: ${locations.map(l => `${l.name} (${l.id})`).join(", ")}`)

  const warehouse = locations.find(l => l.name === "Hops & Glory Warehouse") || locations[0]
  if (!warehouse) {
    logger.error("No stock location found")
    return
  }
  logger.info(`Using warehouse: ${warehouse.name} (${warehouse.id})`)

  const variants = await productModule.listProductVariants({}, { take: 200 })
  logger.info(`Total variants: ${variants.length}`)

  let fixed = 0
  for (const variant of variants) {
    const existingItems = await inventoryModule.listInventoryItems({ sku: variant.sku || undefined })
    let inventoryItem = existingItems[0]

    if (!inventoryItem) {
      inventoryItem = await inventoryModule.createInventoryItems({
        sku: variant.sku || variant.id,
        title: variant.title || "Default",
      })
      await link.create({
        [Modules.PRODUCT]: { variant_id: variant.id },
        [Modules.INVENTORY]: { inventory_item_id: inventoryItem.id },
      })
      logger.info(`  Created inventory item for variant ${variant.id}`)
    }

    const levels = await inventoryModule.listInventoryLevels({
      inventory_item_id: inventoryItem.id,
      location_id: warehouse.id,
    })

    if (!levels.length) {
      await inventoryModule.createInventoryLevels({
        inventory_item_id: inventoryItem.id,
        location_id: warehouse.id,
        stocked_quantity: 24,
      })
      fixed++
      logger.info(`  Set stock for variant ${variant.id} (${variant.sku || "no sku"}) → 24 units`)
    }
  }

  logger.info(`\nFixed ${fixed} variants. Done!`)
}
