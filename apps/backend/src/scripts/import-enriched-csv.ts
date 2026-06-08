/**
 * Run the enriched-catalogue.csv import against the live database.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/import-enriched-csv.ts          # dry run
 *   DRY_RUN=false npx medusa exec ./src/scripts/import-enriched-csv.ts  # commit
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"
import { HOP_MODULE } from "../modules/hop"
import { BEER_STYLE_MODULE } from "../modules/beer-style"
import { parseStockImportCsv, slugify } from "../api/admin/stock-import/parser"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"

export default async function importEnrichedCsv({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as any
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const productModule = container.resolve(Modules.PRODUCT) as any
  const breweryService = container.resolve("brewery") as any
  const hopService = container.resolve(HOP_MODULE) as any
  const beerStyleService = container.resolve(BEER_STYLE_MODULE) as any
  const link = container.resolve(ContainerRegistrationKeys.LINK) as any
  const inventoryModule = container.resolve(Modules.INVENTORY) as any
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION) as any

  const dryRun = process.env.DRY_RUN !== "false"

  const csvPath = path.join(process.cwd(), "data", "enriched-catalogue.csv")
  if (!fs.existsSync(csvPath)) {
    logger.error(`CSV file not found: ${csvPath}`)
    return
  }
  const csv = fs.readFileSync(csvPath, "utf-8")
  const rows = parseStockImportCsv(csv)
  console.log(
    `\n${dryRun ? "[DRY RUN] " : ""}Importing ${rows.length} rows from enriched-catalogue.csv`
  )

  // Pre-load maps
  const breweries = await breweryService.listBreweries({})
  const breweryMap = new Map(breweries.map((b: any) => [b.name.toLowerCase(), b]))

  const hops = await hopService.listHops({})
  const hopMap = new Map(hops.map((h: any) => [h.name.toLowerCase(), h]))

  const styles = await beerStyleService.listBeerStyles({})
  const styleMap = new Map(styles.map((s: any) => [s.name.toLowerCase(), s]))

  const salesChannels = await container.resolve(Modules.SALES_CHANNEL).listSalesChannels({})
  const defaultChannel = salesChannels[0]

  const locations = await stockLocationModule.listStockLocations({})
  const warehouse =
    locations.find(
      (l: any) =>
        l.name.toLowerCase().includes("glory") || l.name.toLowerCase().includes("warehouse")
    ) || locations[0]

  // Stock helper
  async function applyStock(variantId: string, qty: number) {
    if (!warehouse) return
    try {
      const items = await inventoryModule.listInventoryItems({ sku: variantId })
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
      logger.warn(`Stock update failed for ${variantId}: ${e.message}`)
    }
  }

  // Beer style link helper
  async function applyBeerStyleLink(productId: string, styleName: string) {
    if (!styleName) return
    const style = (styleMap as any).get(styleName.toLowerCase())
    if (!style) return
    try {
      const { data: allStyles } = await query.graph({
        entity: "beer_style",
        fields: ["id", "products.id"],
      })
      for (const s of allStyles as any[]) {
        if ((s.products || []).some((p: any) => p.id === productId)) {
          try {
            await link.dismiss({
              [BEER_STYLE_MODULE]: { beer_style_id: s.id },
              [Modules.PRODUCT]: { product_id: productId },
            })
          } catch {}
        }
      }
      await link.create({
        [BEER_STYLE_MODULE]: { beer_style_id: style.id },
        [Modules.PRODUCT]: { product_id: productId },
      })
    } catch (e: any) {
      logger.warn(`Beer style link failed: ${e.message}`)
    }
  }

  let updated = 0
  let created = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      const brewery = (breweryMap as any).get(row.brewery.toLowerCase())
      if (!brewery) {
        errors.push(`"${row.name}": brewery "${row.brewery}" not found`)
        continue
      }

      const resolvedHops = row.hops.map((n) => (hopMap as any).get(n.toLowerCase())).filter(Boolean)

      const containerValue = row.container || "Can 440ml"
      const volumeMl = row.volume_ml ? parseFloat(row.volume_ml) : undefined

      const metaPatch: Record<string, any> = {
        brewery_name: brewery.name,
        brewery_slug: brewery.slug,
        brewery: brewery.name,
        container_type: containerValue,
        container: containerValue,
        style: row.style,
        abv: row.abv,
      }
      if (!isNaN(volumeMl!)) metaPatch.volume_ml = volumeMl

      if (row.hops.length > 0) {
        const hopNames = resolvedHops.map((h: any) => h.name)
        const hopSlugs = resolvedHops.map((h: any) => h.slug || slugify(h.name))
        metaPatch.hops = hopNames
        metaPatch.hop_names = hopNames
        metaPatch.hop_slugs = hopSlugs
      }

      if (row.style) {
        const s = (styleMap as any).get(row.style.toLowerCase())
        if (s) {
          metaPatch.beer_style = s.name
          metaPatch.beer_style_slug = s.slug
          metaPatch.beer_style_family = s.family
        }
      }

      const existingArr = await productModule.listProducts({ title: row.name })
      const existing = existingArr.find(
        (p: any) => p.title === row.name && p.status === "published"
      )
      const stockQty = row.stock ? parseInt(row.stock, 10) : NaN

      if (dryRun) {
        const action = existing ? "update" : "create"
        console.log(
          `  [${action}] ${row.name} — style: ${row.style}, hops: ${row.hops.join(", ") || "none"}, container: ${containerValue}, volume_ml: ${volumeMl ?? "skip"}${!isNaN(stockQty) ? `, stock: ${stockQty}` : ""}`
        )
        if (existing) updated++
        else created++
        continue
      }

      if (existing) {
        const variant = existing.variants?.[0]
        if (variant && row.price) {
          await productModule.updateProductVariants(variant.id, {
            prices: [{ currency_code: "aud", amount: parseFloat(row.price) || 0 }],
          })
        }
        await productModule.updateProducts(existing.id, {
          description: `${row.style} — ${row.abv}% ABV. Brewed by ${brewery.name}`,
          metadata: { ...existing.metadata, ...metaPatch },
        })

        // Replace hop links
        if (row.hops.length > 0) {
          const { data: linked } = await query.graph({
            entity: "product",
            fields: ["hops.id"],
            filters: { id: existing.id },
          })
          for (const h of (linked?.[0] as any)?.hops || []) {
            try {
              await link.dismiss({
                [HOP_MODULE]: { hop_id: h.id },
                [Modules.PRODUCT]: { product_id: existing.id },
              })
            } catch {}
          }
          for (const h of resolvedHops) {
            try {
              await link.create({
                [HOP_MODULE]: { hop_id: (h as any).id },
                [Modules.PRODUCT]: { product_id: existing.id },
              })
            } catch {}
          }
        }

        await applyBeerStyleLink(existing.id, row.style)

        if (!isNaN(stockQty) && stockQty >= 0 && existing.variants?.[0]) {
          await applyStock(existing.variants[0].id, stockQty)
        }

        // Reindex
        try {
          const eventBus = container.resolve(Modules.EVENT_BUS) as any
          await eventBus.emit([{ name: "product.updated", data: { id: existing.id } }])
        } catch {}

        updated++
      } else {
        const handle = `${brewery.slug}-${slugify(row.name)}`
        const { result: products } = await createProductsWorkflow(container as any).run({
          input: {
            products: [
              {
                title: row.name,
                handle,
                description: `${row.style} — ${row.abv}% ABV. Brewed by ${brewery.name}`,
                status: ProductStatus.PUBLISHED,
                metadata: metaPatch,
                options: [{ title: "Size", values: [containerValue] }],
                variants: [
                  {
                    title: `${row.name} — ${containerValue}`,
                    sku: handle,
                    manage_inventory: true,
                    prices: [{ currency_code: "aud", amount: parseFloat(row.price) || 0 }],
                    options: { Size: containerValue },
                  },
                ],
                sales_channels: defaultChannel ? [{ id: defaultChannel.id }] : [],
              } as any,
            ],
          },
        })
        const productId = products?.[0]?.id
        if (productId) {
          await link.create({
            brewery: { brewery_id: brewery.id },
            [Modules.PRODUCT]: { product_id: productId },
          })
          for (const h of resolvedHops) {
            try {
              await link.create({
                [HOP_MODULE]: { hop_id: (h as any).id },
                [Modules.PRODUCT]: { product_id: productId },
              })
            } catch {}
          }
          await applyBeerStyleLink(productId, row.style)
          if (!isNaN(stockQty) && stockQty >= 0) {
            await new Promise((r) => setTimeout(r, 200))
            await applyStock(products[0].variants?.[0]?.id, stockQty)
          }
          try {
            const eventBus = container.resolve(Modules.EVENT_BUS) as any
            await eventBus.emit([{ name: "product.updated", data: { id: productId } }])
          } catch {}
        }
        created++
      }
    } catch (e: any) {
      errors.push(`"${row.name}": ${e.message}`)
    }
  }

  console.log(
    `\n${dryRun ? "[DRY RUN] " : ""}Results: ${created} created, ${updated} updated, ${errors.length} errors`
  )
  if (errors.length) errors.forEach((e) => console.log(`  ERROR: ${e}`))
  if (dryRun) console.log("\nRun with DRY_RUN=false to commit.")
}
