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
import { HOP_MODULE } from "../modules/hop"
import { BEER_STYLE_MODULE } from "../modules/beer-style"
import type { ExecArgs } from "@medusajs/framework/types"
import { createProductsWorkflow, createPriceListsWorkflow } from "@medusajs/medusa/core-flows"
import * as fs from "fs"
import * as path from "path"

function parseDate(str: string): string | null {
  if (!str?.trim()) return null
  const MONTHS: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  }
  const parts = str.trim().split("-")
  if (parts.length !== 3) return null
  const day = parseInt(parts[0], 10)
  const month = MONTHS[parts[1].toLowerCase()]
  const year = parseInt(parts[2], 10)
  if (isNaN(day) || month === undefined || isNaN(year)) return null
  return new Date(Date.UTC(year, month, day)).toISOString()
}

// Approximate packaging weight per ml, by container type — used only when a
// CSV row supplies an explicit "Container type" / "Container size (ml)"
// override (added for breweries like Messorem that mix Can/Bottle/multiple
// sizes within the same brewery, where the old brewery-level hardcode below
// can't express per-beer variation). Derived from the two hardcoded examples
// already in this file: Can 473ml/500g (~1.05 g/ml), Bottle 510ml/700g
// (~1.37 g/ml, glass is heavier). Crowler uses the Troon 950ml/1100g example
// (~1.16 g/ml).
const CONTAINER_WEIGHT_PER_ML: Record<string, number> = {
  can: 1.05,
  bottle: 1.37,
  crowler: 1.16,
}

function getContainer(
  breweryName: string,
  title: string,
  containerTypeOverride?: string,
  sizeMlOverride?: number
): {
  container: string
  volume_ml: number
  weight: number
} {
  if (containerTypeOverride && sizeMlOverride && !isNaN(sizeMlOverride)) {
    const typeKey = containerTypeOverride.toLowerCase().trim()
    const perMl = CONTAINER_WEIGHT_PER_ML[typeKey] ?? 1.1
    return {
      container: `${containerTypeOverride.trim()} ${sizeMlOverride}ml`,
      volume_ml: sizeMlOverride,
      weight: Math.round(sizeMlOverride * perMl),
    }
  }
  if (breweryName === "Troon") {
    return { container: "Crowler 950ml", volume_ml: 950, weight: 1100 }
  }
  if (breweryName === "Russian River" && title === "Pliny the Elder") {
    return { container: "Bottle 510ml", volume_ml: 510, weight: 700 }
  }
  return { container: "Can 473ml", volume_ml: 473, weight: 500 }
}

function normalizeTitle(str: string): string {
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim()
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

// Mirrors backfill-beer-style-links.ts SYNONYMS/resolveStyle — scraped CSV
// style strings rarely match BeerStyle canonical names exactly.
const STYLE_SYNONYMS: Record<string, string> = {
  "india pale ale": "ipa",
  "indian pale ale": "ipa",
  "ne ipa": "neipa",
  "new england ipa": "neipa",
  "hazy ipa": "neipa",
  hazy: "neipa",
  wcipa: "west-coast-ipa",
  "wc ipa": "west-coast-ipa",
  "west coast": "west-coast-ipa",
  dipa: "double-ipa",
  "imperial ipa": "double-ipa",
  iipa: "double-ipa",
  tipa: "triple-ipa",
  apa: "american-pale-ale",
  "american pale": "american-pale-ale",
  "extra pale ale": "xpa",
  weizen: "hefeweizen",
  white: "witbier",
  wheat: "hefeweizen",
  lambic: "wild-ale",
  pils: "pilsner",
  marzen: "lager",
  "vienna lager": "lager",
  kolsch: "lager",
  amber: "red-ale",
  "robust porter": "porter",
  "brown porter": "porter",
  "baltic porter": "porter",
  "session ipa": "session-ipa",
  "fruit beer": "fruit-sour",
}

function normalizeStyle(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ")
}

function resolveStyle(raw: string, byName: Map<string, any>, bySlug: Map<string, any>): any | null {
  if (!raw) return null
  const norm = normalizeStyle(raw)
  if (byName.has(norm)) return byName.get(norm)
  const slug = slugify(raw)
  if (bySlug.has(slug)) return bySlug.get(slug)
  if (STYLE_SYNONYMS[norm] && bySlug.has(STYLE_SYNONYMS[norm])) {
    return bySlug.get(STYLE_SYNONYMS[norm])
  }
  for (const [synKey, synSlug] of Object.entries(STYLE_SYNONYMS)) {
    if (norm.includes(synKey) && bySlug.has(synSlug)) return bySlug.get(synSlug)
  }
  for (const [styleSlug, styleObj] of bySlug.entries()) {
    if (norm.includes(styleSlug.replace(/-/g, " "))) return styleObj
  }
  return null
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
  const hopService = container.resolve(HOP_MODULE) as any
  const beerStyleService = container.resolve(BEER_STYLE_MODULE) as any
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const [defaultShippingProfile] = await fulfillmentModule.listShippingProfiles()

  const HOP_NORMALIZATION: Record<string, string> = {
    Nelson: "Nelson Sauvin",
    "Nelson Sauvin": "Nelson Sauvin",
    CTZ: "CTZ",
    Columbus: "Columbus",
  }

  async function buildHopMap() {
    const allHops = await hopService.listHops({})
    const map: Record<string, any> = {}
    for (const h of allHops) map[h.name.toLowerCase()] = h
    return map
  }

  async function linkHops(hopMap: Record<string, any>, hopNames: string, productId: string) {
    for (const token of hopNames
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean)) {
      const normalized = HOP_NORMALIZATION[token] || token
      const hop = hopMap[normalized.toLowerCase()]
      if (!hop) continue
      try {
        await link.create({
          [HOP_MODULE]: { hop_id: hop.id },
          [Modules.PRODUCT]: { product_id: productId },
        })
      } catch {
        // already exists
      }
    }
  }

  const hopMap = await buildHopMap()

  // Beer style map + link helper — see F3 in wi65 analysis: without this,
  // style is written to metadata.style only and never becomes the
  // beer_style<->product link that MeiliSearch's style_family facet reads.
  const allStyles = await beerStyleService.listBeerStyles({})
  const styleByName = new Map<string, any>(allStyles.map((s: any) => [normalizeStyle(s.name), s]))
  const styleBySlug = new Map<string, any>(allStyles.map((s: any) => [s.slug, s]))

  async function applyBeerStyleLink(productId: string, rawStyle: string) {
    const style = resolveStyle(rawStyle, styleByName, styleBySlug)
    if (!style) {
      if (rawStyle) logger.warn(`Unresolved beer style "${rawStyle}" for product ${productId}`)
      return
    }
    try {
      await link.create({
        [BEER_STYLE_MODULE]: { beer_style_id: style.id },
        [Modules.PRODUCT]: { product_id: productId },
      })
    } catch {
      // already linked — ignore
    }
  }

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

  // Find the canonical H&G sales channel by name — never fall back to [0]
  const allChannels = await salesChannelModule.listSalesChannels({})
  const salesChannel = allChannels.find(
    (c) => c.name.toLowerCase().includes("hops") || c.name.toLowerCase().includes("glory")
  )
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

  // Pre-load all products once for idempotent matching, keyed by handle (exact,
  // authoritative — see slugify() below) and by lowercased title (fallback for
  // rows whose stored title differs only in case, e.g. "Slumbering wraith" vs
  // "slumbering wraith"). A single upfront listProducts({title}) exact-match
  // query per row previously missed case-mismatched titles entirely, routing
  // them to batch-create where they'd throw a handle collision and take out
  // the other 9 products in that batch. take is set high — this catalog is a
  // few hundred products, not paginated thousands.
  const allProducts = await productModule.listProducts({}, { take: 10000 })
  const productByHandle: Record<string, any> = {}
  const productByTitleLower: Record<string, any> = {}
  for (const p of allProducts as any[]) {
    if (p.status !== "published") continue
    if (p.handle) productByHandle[p.handle] = p
    if (p.title) productByTitleLower[p.title.toLowerCase().trim()] = p
  }

  // Ensure all breweries exist (main + collab)
  const uniqueBreweries = [
    ...new Set([
      ...rows.map((r) => r["Brewery"]).filter(Boolean),
      ...rows.flatMap((r) =>
        (r["Colab"] || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ]),
  ]
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
    const title = normalizeTitle(row["Beer"] || "")
    const breweryName = normalizeTitle(row["Brewery"] || "")
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

    const { container, volume_ml, weight } = getContainer(
      breweryName,
      title,
      row["Container type"],
      row["Container size (ml)"] ? parseFloat(row["Container size (ml)"]) : undefined
    )
    const packedAtISO = parseDate(releasedDate)
    const dateAddedISO = parseDate(row["Date Added"])

    const metadata: Record<string, any> = {
      abv,
      untappd_score: untappd,
      brewery: breweryName,
      brewery_name: breweryName,
      brewery_slug: slugify(breweryName),
      style,
      released_date: releasedDate,
      packaged_at: packedAtISO,
      comment: comment || null,
      origin: "US",
      container,
      volume_ml,
    }
    if (dateAddedISO) metadata.date_added = dateAddedISO
    if (hops) metadata.hop_names = hops
    if (colab) metadata.collab_partner = colab

    // Check if product already exists — handle match first (exact, authoritative),
    // then case-insensitive title fallback. See pre-load comment above for why.
    const existing = productByHandle[handle] || productByTitleLower[title.toLowerCase().trim()]

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
            weight,
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

        // Beer style link — see F3 in wi65 analysis
        if (style) await applyBeerStyleLink(existing.id, style)

        // Hop links from metadata.hop_names
        if (hops) await linkHops(hopMap, hops, existing.id)

        // Collab brewery links
        if (colab) {
          const collabNames = colab
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
          for (const collabName of collabNames) {
            const collabBrewery = breweryMap[collabName.toLowerCase()]
            if (collabBrewery) {
              try {
                await link.create({
                  brewery: { brewery_id: collabBrewery.id },
                  [Modules.PRODUCT]: { product_id: existing.id },
                })
              } catch {
                // link already exists — ignore
              }
            }
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
        const title = normalizeTitle(row["Beer"] || "")
        const breweryName = normalizeTitle(row["Brewery"] || "")
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
        const { container, volume_ml, weight } = getContainer(
          breweryName,
          title,
          row["Container type"],
          row["Container size (ml)"] ? parseFloat(row["Container size (ml)"]) : undefined
        )
        const packedAtISO = parseDate(releasedDate)
        const dateAddedISO = parseDate(row["Date Added"])

        const metadata: Record<string, any> = {
          abv,
          untappd_score: untappd,
          brewery: breweryName,
          brewery_name: breweryName,
          brewery_slug: slugify(breweryName),
          style,
          released_date: releasedDate,
          packaged_at: packedAtISO,
          comment: comment || null,
          origin: "US",
          container,
          volume_ml,
        }
        if (dateAddedISO) metadata.date_added = dateAddedISO
        if (hops) metadata.hop_names = hops
        if (colab) metadata.collab_partner = colab

        return {
          title,
          handle,
          description: [style, abv ? `${abv}% ABV` : "", container, comment || ""]
            .filter(Boolean)
            .join(" · "),
          status: ProductStatus.PUBLISHED,
          metadata,
          options: [{ title: "Format", values: ["Can"] }],
          variants: [
            {
              title: `${title} — ${container}`,
              sku,
              manage_inventory: true,
              weight,
              prices: [{ currency_code: "aud", amount: basePrice }],
              options: { Format: "Can" },
            },
          ],
          sales_channels: [{ id: salesChannel.id }],
          _brewery_name: breweryName,
          _colab: colab,
          _hops: hops,
          _style: style,
          _stock: parseInt(row["Left"] || "0"),
          _sku: sku,
          _handle: handle,
          _sale_price: salePrice,
        }
      })

      try {
        const input = workflowInput.map(
          ({
            _brewery_name,
            _colab,
            _hops,
            _style,
            _stock,
            _sku,
            _handle,
            _sale_price,
            ...product
          }) => product
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

          // Shipping profile link — without this, cart.complete() hard-fails
          // at checkout with "shipping profiles that are not satisfied" for
          // any cart containing this product. createProductsWorkflow does not
          // auto-link to a shipping profile that already existed pre-import.
          if (defaultShippingProfile) {
            try {
              await link.create({
                [Modules.PRODUCT]: { product_id: products[j].id },
                [Modules.FULFILLMENT]: { shipping_profile_id: defaultShippingProfile.id },
              })
            } catch (e: any) {
              logger.warn(
                `Shipping profile link failed for ${workflowInput[j].title}: ${e.message}`
              )
            }
          }

          // Collab brewery links
          // Hop links for new products
          const newHops = workflowInput[j]._hops
          if (newHops) await linkHops(hopMap, newHops, products[j].id)

          // Beer style link — see F3 in wi65 analysis
          const newStyle = workflowInput[j]._style
          if (newStyle) await applyBeerStyleLink(products[j].id, newStyle)

          const collabRaw = workflowInput[j]._colab
          if (collabRaw) {
            const collabNames = collabRaw
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
            for (const collabName of collabNames) {
              const collabBrewery = breweryMap[collabName.toLowerCase()]
              if (collabBrewery) {
                try {
                  await link.create({
                    brewery: { brewery_id: collabBrewery.id },
                    [Modules.PRODUCT]: { product_id: products[j].id },
                  })
                } catch {
                  // link already exists — ignore
                }
              }
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
