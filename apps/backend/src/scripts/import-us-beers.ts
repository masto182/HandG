/**
 * Import in-stock US beers from data/us-beers-import.csv
 *
 * Idempotent: updates existing products by title match, creates new ones.
 * Sale pricing uses Medusa SALE price lists (hg-sale-{handle}) so the
 * storefront's calculated_price mechanism shows the strikethrough correctly.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/import-us-beers.ts            # dry run (default)
 *   DRY_RUN=false npx medusa exec ./src/scripts/import-us-beers.ts  # commit
 */
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { createProductsWorkflow, createPriceListsWorkflow } from "@medusajs/medusa/core-flows"
import * as fs from "fs"
import * as path from "path"

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf-8")
  const lines = content.split("\n").filter((l) => l.trim())
  const headers = parseLine(lines[0])

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim()
    })
    rows.push(row)
  }
  return rows
}

function parseLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      values.push(current)
      current = ""
    } else {
      current += char
    }
  }
  values.push(current)
  return values
}

export default async function importProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT) as any
  const pricingModule = container.resolve(Modules.PRICING) as any
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const inventoryModule = container.resolve(Modules.INVENTORY) as any
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const breweryService = container.resolve("brewery") as any

  const dryRun = process.env.DRY_RUN !== "false"

  logger.info(`Starting US beer import (${dryRun ? "DRY RUN" : "COMMIT"})...`)

  const csvPath = process.env.IMPORT_CSV
    ? path.resolve(process.env.IMPORT_CSV)
    : path.join(process.cwd(), "data", "us-beers-import.csv")
  if (!fs.existsSync(csvPath)) {
    logger.error(`CSV file not found at ${csvPath}`)
    logger.error("Copy the CSV to data/us-beers-import.csv or set IMPORT_CSV=/path/to/file")
    return
  }

  const rows = parseCSV(csvPath)
  logger.info(`Parsed ${rows.length} rows from CSV`)

  // Find the canonical H&G sales channel — not just [0] to avoid the orphan Default channel
  const allChannels = await salesChannelModule.listSalesChannels({})
  const salesChannel =
    allChannels.find(
      (c) => c.name.toLowerCase().includes("hops") || c.name.toLowerCase().includes("glory")
    ) || allChannels[0]
  if (!salesChannel) {
    logger.error("No sales channel found — run the base seed first")
    return
  }
  logger.info(`Using sales channel: ${salesChannel.name}`)

  // Find the warehouse stock location
  const locations = await stockLocationModule.listStockLocations({})
  const warehouse =
    locations.find(
      (l) => l.name.toLowerCase().includes("glory") || l.name.toLowerCase().includes("warehouse")
    ) || locations[0]
  if (!warehouse) {
    logger.error("No stock location found — run the base seed first")
    return
  }

  // Pre-load brewery map
  const existingBreweries = await breweryService.listBreweries({})
  const breweryMap: Record<string, any> = {}
  for (const b of existingBreweries) {
    breweryMap[b.name.toLowerCase()] = b
  }

  // Ensure all breweries exist
  const uniqueBreweries = [...new Set(rows.map((r) => r["Brewery"]).filter(Boolean))]
  for (const breweryName of uniqueBreweries) {
    if (breweryMap[breweryName.toLowerCase()]) continue
    if (dryRun) {
      logger.info(`[dry run] Would create brewery: ${breweryName}`)
      continue
    }
    const b = await breweryService.createBreweries({
      name: breweryName,
      slug: slugify(breweryName),
      location: "United States",
      description: `${breweryName} — featured producer in the Hops & Glory private collection.`,
    })
    breweryMap[breweryName.toLowerCase()] = b
    logger.info(`Created brewery: ${breweryName}`)
  }

  // Helper: update or create inventory level
  async function applyStock(variantId: string, sku: string, qty: number) {
    if (!warehouse || qty <= 0) return
    try {
      const items = await inventoryModule.listInventoryItems({ sku })
      const item = items?.[0]
      if (!item) return
      const levels = await inventoryModule.listInventoryLevels({
        inventory_item_id: item.id,
        location_id: warehouse.id,
      })
      if (levels?.length) {
        await inventoryModule.updateInventoryLevels([{ id: levels[0].id, stocked_quantity: qty }])
      } else {
        await inventoryModule.createInventoryLevels({
          inventory_item_id: item.id,
          location_id: warehouse.id,
          stocked_quantity: qty,
        })
      }
    } catch (e: any) {
      logger.warn(`Stock update failed for ${sku}: ${e.message}`)
    }
  }

  // Helper: create or replace an hg-sale-{handle} SALE price list.
  // When salePrice is null the price list is removed if it exists.
  async function applyPriceList(handle: string, variantId: string, salePrice: number | null) {
    const title = `hg-sale-${handle}`
    try {
      const existingLists = await pricingModule.listPriceLists({ type: "sale" })
      const current = (existingLists as any[]).find((pl: any) => pl.title === title) || null
      if (salePrice !== null) {
        if (current) {
          await pricingModule.deletePriceLists([current.id])
        }
        await createPriceListsWorkflow(container).run({
          input: {
            price_lists_data: [
              {
                title,
                description: `Sale price for ${handle}`,
                type: "sale",
                status: "active",
                prices: [{ variant_id: variantId, currency_code: "aud", amount: salePrice }],
              },
            ],
          } as any,
        })
      } else if (current) {
        await pricingModule.deletePriceLists([current.id])
      }
    } catch (e: any) {
      logger.warn(`Price list update failed for ${handle}: ${e.message}`)
    }
  }

  const toCreate: typeof rows = []
  let updatedCount = 0
  let errors = 0

  for (const row of rows) {
    const title = row["Beer"]?.trim()
    const breweryName = row["Brewery"]?.trim()
    if (!title || !breweryName) continue

    const rawPrice = parseFloat(row["Price"] || "0")
    const was = parseFloat(row["Was"] || "0")
    // When Was > Price, the product is on sale:
    //   basePrice  = Was (shown as strikethrough)
    //   salePrice  = Price (effective selling price via SALE price list)
    const salePrice = was > rawPrice ? rawPrice : null
    const basePrice = salePrice !== null ? was : rawPrice

    const stock = parseInt(row["Left"] || "0")
    const abv = parseFloat(row["ABV"]?.replace("%", "") || "0")
    const untappd = parseFloat(row["untappd"] || "0")
    const style = row["Style"] || ""
    const comment = row["Comment"] || ""
    const releasedDate = row["Released Date"] || ""
    const hops = row["Hops"] || ""
    const colab = row["Colab"] || ""
    const sku = `us-${slugify(breweryName)}-${slugify(title)}`.slice(0, 100)
    const handle = slugify(`${breweryName}-${title}`)

    const metadata: Record<string, any> = {
      abv,
      untappd_score: untappd,
      brewery: breweryName,
      brewery_name: breweryName,
      brewery_slug: slugify(breweryName),
      style,
      released_date: releasedDate,
      comment: comment || null,
      origin: "US",
    }
    if (hops) metadata.hop_names = hops
    if (colab) metadata.collab_partner = colab

    // Check if product already exists
    const existingArr = await productModule.listProducts({ title })
    const existing = existingArr.find((p: any) => p.title === title && p.status === "published")

    if (existing) {
      const variant = existing.variants?.[0]
      const saleLabel = salePrice !== null ? ` (was $${was})` : ""
      if (dryRun) {
        logger.info(`[update] ${breweryName} — ${title} @ $${rawPrice}${saleLabel}, stock=${stock}`)
        continue
      }

      try {
        if (variant) {
          await productModule.updateProductVariants(variant.id, {
            prices: [{ currency_code: "aud", amount: basePrice }],
          })
          await applyStock(variant.id, sku, stock)
          // Manage sale price list — uses existing.handle for reliable lookup
          await applyPriceList(existing.handle || handle, variant.id, salePrice)
        }
        await productModule.updateProducts(existing.id, {
          metadata: { ...existing.metadata, ...metadata },
        })

        // Brewery link (skip if already linked)
        const brewery = breweryMap[breweryName.toLowerCase()]
        if (brewery) {
          try {
            await link.create({
              brewery: { brewery_id: brewery.id },
              [Modules.PRODUCT]: { product_id: existing.id },
            })
          } catch {
            // link already exists — ignore
          }
        }

        updatedCount++
        logger.info(`Updated: ${breweryName} — ${title}`)
      } catch (e: any) {
        logger.error(`Update failed for ${title}: ${e.message}`)
        errors++
      }
    } else {
      // Queue for batch create
      if (dryRun) {
        const saleLabel = salePrice !== null ? ` (was $${was})` : ""
        logger.info(`[create] ${breweryName} — ${title} @ $${rawPrice}${saleLabel}, stock=${stock}`)
        continue
      }
      toCreate.push(row)
    }
  }

  // Batch create new products
  if (!dryRun && toCreate.length > 0) {
    logger.info(`Creating ${toCreate.length} new products...`)

    const BATCH_SIZE = 10
    let createdCount = 0

    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      const batch = toCreate.slice(i, i + BATCH_SIZE)

      const workflowInput = batch.map((row) => {
        const title = row["Beer"].trim()
        const breweryName = row["Brewery"].trim()
        const rawPrice = parseFloat(row["Price"] || "0")
        const was = parseFloat(row["Was"] || "0")
        const salePrice = was > rawPrice ? rawPrice : null
        const basePrice = salePrice !== null ? was : rawPrice
        const abv = parseFloat(row["ABV"]?.replace("%", "") || "0")
        const untappd = parseFloat(row["untappd"] || "0")
        const style = row["Style"] || ""
        const comment = row["Comment"] || ""
        const releasedDate = row["Released Date"] || ""
        const hops = row["Hops"] || ""
        const colab = row["Colab"] || ""
        const sku = `us-${slugify(breweryName)}-${slugify(title)}`.slice(0, 100)
        const handle = slugify(`${breweryName}-${title}`)

        const metadata: Record<string, any> = {
          abv,
          untappd_score: untappd,
          brewery: breweryName,
          brewery_name: breweryName,
          brewery_slug: slugify(breweryName),
          style,
          released_date: releasedDate,
          comment: comment || null,
          origin: "US",
        }
        if (hops) metadata.hop_names = hops
        if (colab) metadata.collab_partner = colab

        return {
          title,
          handle,
          description: [style, abv ? `${abv}% ABV` : "", comment || ""].filter(Boolean).join(" · "),
          status: ProductStatus.PUBLISHED,
          metadata,
          options: [{ title: "Format", values: ["Can"] }],
          variants: [
            {
              title: `${title} — Can`,
              sku,
              manage_inventory: true,
              weight: 500,
              prices: [{ currency_code: "aud", amount: basePrice }],
              options: { Format: "Can" },
            },
          ],
          sales_channels: [{ id: salesChannel.id }],
          _brewery_name: breweryName,
          _stock: parseInt(row["Left"] || "0"),
          _sku: sku,
          _handle: handle,
          _sale_price: salePrice,
        }
      })

      try {
        const input = workflowInput.map(
          ({ _brewery_name, _stock, _sku, _handle, _sale_price, ...product }) => product
        )
        const { result: products } = await createProductsWorkflow(container).run({
          input: { products: input },
        })

        for (let j = 0; j < products.length; j++) {
          const breweryName = workflowInput[j]._brewery_name
          const brewery = breweryMap[breweryName.toLowerCase()]
          if (brewery) {
            try {
              await link.create({
                brewery: { brewery_id: brewery.id },
                [Modules.PRODUCT]: { product_id: products[j].id },
              })
            } catch (e: any) {
              logger.warn(`Brewery link failed for ${workflowInput[j].title}: ${e.message}`)
            }
          }

          const newVariant = products[j].variants[0]

          // Set stock for new product
          await applyStock(newVariant.id, workflowInput[j]._sku, workflowInput[j]._stock)

          // Set sale price list if applicable
          if (workflowInput[j]._sale_price !== null && newVariant) {
            await applyPriceList(
              products[j].handle || workflowInput[j]._handle,
              newVariant.id,
              workflowInput[j]._sale_price
            )
          }
        }

        createdCount += products.length
        logger.info(
          `Batch ${Math.floor(i / BATCH_SIZE) + 1}: created ${products.length} (${createdCount}/${toCreate.length})`
        )
      } catch (e: any) {
        logger.error(`Create batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${e.message}`)
        errors++
      }
    }

    logger.info(`Created ${createdCount} new products`)
  }

  if (dryRun) {
    logger.info(`Dry run complete — ${rows.length} rows parsed (use DRY_RUN=false to commit)`)
  } else {
    logger.info(`Import complete — updated: ${updatedCount}, errors: ${errors}`)
  }
}
