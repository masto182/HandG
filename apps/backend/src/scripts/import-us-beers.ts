import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import {
  createProductsWorkflow,
  createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"
import * as fs from "fs"
import * as path from "path"

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function parseCSV(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8")
  const lines = content.split("\n").filter((l) => l.trim())
  const headers = lines[0].split(",")

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = []
    let current = ""
    let inQuotes = false

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        values.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx] || ""
    })
    rows.push(row)
  }
  return rows
}

export default async function importProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const breweryService = container.resolve("brewery") as any

  logger.info("Starting US beer import...")

  const csvPath = path.resolve(__dirname, "../../data/us-beers-current.csv")
  if (!fs.existsSync(csvPath)) {
    logger.error(`CSV file not found at ${csvPath}`)
    logger.error("Place the CSV at apps/backend/data/us-beers-current.csv")
    return
  }

  const rows = parseCSV(csvPath)
  logger.info(`Parsed ${rows.length} products from CSV`)

  const salesChannels = await salesChannelModule.listSalesChannels({})
  if (!salesChannels.length) {
    logger.error("No sales channel found. Run the base seed first.")
    return
  }
  const salesChannel = salesChannels[0]

  const stockLocations = await stockLocationModule.listStockLocations({})
  if (!stockLocations.length) {
    logger.error("No stock location found. Run the base seed first.")
    return
  }
  const stockLocation = stockLocations[0]

  const uniqueBreweries = [...new Set(rows.map((r) => r["Brewery"]).filter(Boolean))]
  logger.info(`Found ${uniqueBreweries.length} unique breweries`)

  const breweryMap: Record<string, any> = {}
  const existingBreweries = await breweryService.listBreweries({})

  for (const existing of existingBreweries) {
    breweryMap[existing.name.toLowerCase()] = existing
  }

  for (const breweryName of uniqueBreweries) {
    if (breweryMap[breweryName.toLowerCase()]) continue

    const brewery = await breweryService.createBreweries({
      name: breweryName,
      slug: slugify(breweryName),
      location: "United States",
      description: `${breweryName} — featured producer in the Hops & Glory private collection.`,
    })
    breweryMap[breweryName.toLowerCase()] = brewery
    logger.info(`Created brewery: ${breweryName}`)
  }

  const productsInput = rows.map((row) => {
    const title = row["Beer"] || "Untitled"
    const brewery = row["Brewery"] || "Unknown"
    const abv = parseFloat(row["ABV"]?.replace("%", "") || "0")
    const untappd = parseFloat(row["untappd"] || "0")
    const style = row["Style"] || ""
    const comment = row["Comment"] || ""
    const stock = parseInt(row["Left"] || "0")
    const releasedDate = row["Released Date"] || ""
    const hasCollabMention = comment.toLowerCase().includes("colab") || comment.toLowerCase().includes("collab")

    const sku = `us-${slugify(brewery)}-${slugify(title)}`.slice(0, 100)

    return {
      title,
      handle: slugify(`${brewery}-${title}`),
      description: [
        style,
        abv ? `${abv}% ABV` : "",
        comment ? comment : "",
      ].filter(Boolean).join(" · "),
      status: ProductStatus.PUBLISHED,
      metadata: {
        abv,
        untappd_score: untappd,
        brewery,
        style,
        is_collab: hasCollabMention,
        released_date: releasedDate,
        comment: comment || null,
        origin: "US",
      },
      options: [{ title: "Format", values: ["Can"] }],
      variants: [
        {
          title: `${title} — Can`,
          sku,
          manage_inventory: true,
          weight: 500,
          prices: [{ currency_code: "aud", amount: 15 }],
          options: { Format: "Can" },
        },
      ],
      sales_channels: [{ id: salesChannel.id }],
      _stock: stock,
      _brewery_name: brewery,
    }
  })

  const BATCH_SIZE = 10
  let createdCount = 0

  for (let i = 0; i < productsInput.length; i += BATCH_SIZE) {
    const batch = productsInput.slice(i, i + BATCH_SIZE)

    const workflowInput = batch.map(({ _stock, _brewery_name, ...product }) => product)

    try {
      const { result: products } = await createProductsWorkflow(container).run({
        input: { products: workflowInput },
      })

      for (let j = 0; j < products.length; j++) {
        const breweryName = batch[j]._brewery_name
        const brewery = breweryMap[breweryName.toLowerCase()]
        if (brewery) {
          try {
            await link.create({
              brewery: { brewery_id: brewery.id },
              [Modules.PRODUCT]: { product_id: products[j].id },
            })
          } catch (e: any) {
            logger.warn(`Link failed for ${batch[j].title}: ${e.message}`)
          }
        }
      }

      createdCount += products.length
      logger.info(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: Created ${products.length} products (${createdCount}/${productsInput.length})`)
    } catch (e: any) {
      logger.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${e.message}`)
    }
  }

  logger.info("Setting inventory levels...")
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku"],
  })

  const skuToStock: Record<string, number> = {}
  for (const row of productsInput) {
    const sku = `us-${slugify(row._brewery_name)}-${slugify(row.title)}`.slice(0, 100)
    skuToStock[sku] = row._stock || 1
  }

  const newLevels = inventoryItems
    .filter((item: any) => item.sku?.startsWith("us-"))
    .map((item: any) => ({
      location_id: stockLocation.id,
      stocked_quantity: skuToStock[item.sku] || 1,
      inventory_item_id: item.id,
    }))

  if (newLevels.length > 0) {
    for (let i = 0; i < newLevels.length; i += BATCH_SIZE) {
      const batch = newLevels.slice(i, i + BATCH_SIZE)
      try {
        await createInventoryLevelsWorkflow(container).run({
          input: { inventory_levels: batch },
        })
      } catch (e: any) {
        logger.warn(`Inventory batch failed: ${e.message}`)
      }
    }
    logger.info(`Set inventory for ${newLevels.length} items`)
  }

  logger.info(`Import complete! Created ${createdCount} products from US beer list.`)
}
