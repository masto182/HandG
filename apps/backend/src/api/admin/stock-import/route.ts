import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import { createInventoryLevelsWorkflow, createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { HOP_MODULE } from "../../../modules/hop"
import { BEER_STYLE_MODULE } from "../../../modules/beer-style"
import { createBreweryWorkflow } from "../../../workflows/manage-brewery"
import { createHopWorkflow } from "../../../workflows/manage-hop"
import { updateImportedProductWorkflow } from "../../../workflows/update-imported-product"
import { parseStockImportCsv, slugify, type ParsedRow } from "./parser"

type ImportOptions = {
  auto_create_breweries?: boolean
  auto_create_hops?: boolean
  dry_run?: boolean
}

// Canonical import column order — keep in sync with parser.KNOWN_COLUMNS so an
// export round-trips straight back into the importer.
const EXPORT_COLUMNS = [
  "name",
  "brewery",
  "style",
  "abv",
  "price",
  "stock",
  "container",
  "volume_ml",
  "description",
  "collab_breweries",
  "hops",
  "images",
  "release_at",
  "is_anniversary",
] as const

const csvEscape = (v: unknown): string => {
  const s = v == null ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// GET = export the current published catalogue as a CSV template in the exact
// import column format. Re-importing the edited file updates existing products
// (matched by title) and creates any new rows.
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // Fetch products with linked hops (hops.* works from the product side via N:M link).
    // Beer style uses a reverse traversal below (same pattern as breweries).
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "metadata",
        "variants.prices.amount",
        "variants.prices.currency_code",
        "images.url",
        "hops.*",
      ],
      filters: { status: "published" } as any,
    })

    // product_id -> linked beer_style (reverse traversal — querying from beer_style
    // side is the reliable pattern for this 1:N link in HandG).
    const styleByProduct = new Map<string, { name: string; slug: string; family: string }>()
    try {
      const { data: beerStyles } = await query.graph({
        entity: "beer_style",
        fields: ["name", "slug", "family", "products.id"],
      })
      for (const s of beerStyles as any[]) {
        for (const p of s.products || []) {
          styleByProduct.set(p.id, { name: s.name, slug: s.slug, family: s.family })
        }
      }
    } catch {}

    // product_id -> [{ name, slug }] of all linked breweries
    const breweriesByProduct = new Map<string, Array<{ name: string; slug: string }>>()
    try {
      const { data: breweries } = await query.graph({
        entity: "brewery",
        fields: ["name", "slug", "products.id"],
      })
      for (const b of breweries as any[]) {
        for (const p of b.products || []) {
          const arr = breweriesByProduct.get(p.id) || []
          arr.push({ name: b.name, slug: b.slug })
          breweriesByProduct.set(p.id, arr)
        }
      }
    } catch {}

    // product_id -> total available stock across variant inventory levels
    const stockByProduct = new Map<string, number>()
    try {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["product_id", "inventory_items.inventory.location_levels.stocked_quantity"],
      })
      for (const v of variants as any[]) {
        let qty = 0
        for (const ii of v.inventory_items || []) {
          for (const ll of ii.inventory?.location_levels || []) {
            qty += Number(ll.stocked_quantity || 0)
          }
        }
        stockByProduct.set(v.product_id, (stockByProduct.get(v.product_id) || 0) + qty)
      }
    } catch {}

    const rows: string[] = [EXPORT_COLUMNS.join(",")]

    for (const p of products) {
      const md = (p.metadata || {}) as Record<string, any>
      const primarySlug = md.brewery_slug
      const linked = breweriesByProduct.get(p.id) || []
      const collabs = linked.filter((b) => b.slug !== primarySlug).map((b) => b.name)

      // lowest AUD price across variants
      let price: number | null = null
      for (const v of p.variants || []) {
        for (const pr of (v as any).prices || []) {
          if (pr.currency_code === "aud") {
            price = price == null ? Number(pr.amount) : Math.min(price, Number(pr.amount))
          }
        }
      }

      // Hops: prefer linked hops (link table), fall back to metadata variants
      const linkedHopNames = ((p as any).hops || []).map((h: any) => h.name).filter(Boolean)
      const hops =
        linkedHopNames.length > 0
          ? linkedHopNames.join(",")
          : Array.isArray(md.hops)
            ? md.hops.join(",")
            : Array.isArray(md.hop_names)
              ? md.hop_names.join(",")
              : ""

      // Style: prefer linked beer_style (via reverse-traversal map), fall back to metadata
      const linkedStyle = styleByProduct.get(p.id)
      const style = linkedStyle?.name || md.beer_style || md.style || ""

      // Container: prefer container_type key (what TechnicalSpecs reads)
      const container = md.container_type || md.container || ""

      const images = (p.images || []).map((i: any) => i.url).join(",")
      const stock = stockByProduct.get(p.id)

      const record: Record<(typeof EXPORT_COLUMNS)[number], unknown> = {
        name: p.title,
        brewery: md.brewery_name || linked.find((b) => b.slug === primarySlug)?.name || "",
        style,
        abv: md.abv ?? "",
        price: price ?? "",
        stock: stock ?? "",
        container,
        volume_ml: md.volume_ml ?? "",
        description: (p as any).description ?? "",
        collab_breweries: collabs.join(","),
        hops,
        images,
        release_at: md.release_at || md.early_access_until || "",
        is_anniversary: typeof md.is_anniversary === "boolean" ? String(md.is_anniversary) : "",
      }

      rows.push(EXPORT_COLUMNS.map((c) => csvEscape(record[c])).join(","))
    }

    res.json({ csv: rows.join("\n"), count: products.length })
  } catch (err: any) {
    logger.error(`[Stock export] failed: ${err?.message}\n${err?.stack}`)
    res.status(500).json({ message: err?.message || "Export failed" })
  }
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = req.scope.resolve(Modules.PRODUCT) as any
  const breweryService = req.scope.resolve("brewery") as any
  const hopService = req.scope.resolve(HOP_MODULE) as any
  const beerStyleService = req.scope.resolve(BEER_STYLE_MODULE) as any
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK) as any
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const inventoryModule = req.scope.resolve(Modules.INVENTORY) as any
  const stockLocationModule = req.scope.resolve(Modules.STOCK_LOCATION) as any

  const body = (req.body || {}) as { csv?: string; options?: ImportOptions }
  const { csv } = body
  const options: ImportOptions = body.options || {}
  const autoCreateBreweries = options.auto_create_breweries === true
  const autoCreateHops = options.auto_create_hops === true
  const dryRun = options.dry_run === true

  if (!csv) {
    return res.status(400).json({ message: "CSV data required" })
  }
  if (csv.length > 500000) {
    return res.status(400).json({ message: "CSV too large (max 500KB)" })
  }

  let rows: ParsedRow[]
  try {
    rows = parseStockImportCsv(csv)
  } catch (err: any) {
    return res.status(400).json({ message: `CSV parse failed: ${err.message}` })
  }
  if (!rows.length) {
    return res.status(400).json({ message: "No valid rows found in CSV" })
  }
  if (rows.length > 500) {
    return res.status(400).json({ message: "Too many rows (max 500)" })
  }

  // Pre-load lookup maps
  const breweries = await breweryService.listBreweries({})
  const breweryMap = new Map<string, any>(breweries.map((b: any) => [b.name.toLowerCase(), b]))

  const hops = await hopService.listHops({})
  const hopMap = new Map<string, any>(hops.map((h: any) => [h.name.toLowerCase(), h]))

  const styles = await beerStyleService.listBeerStyles({})
  const styleMap = new Map<string, any>(styles.map((s: any) => [s.name.toLowerCase(), s]))

  const salesChannels = await req.scope.resolve(Modules.SALES_CHANNEL).listSalesChannels({})
  const defaultChannel = salesChannels[0]

  // Resolve default warehouse once — used for stock updates
  let defaultWarehouse: any = null
  try {
    const locations = await stockLocationModule.listStockLocations({})
    defaultWarehouse =
      locations.find(
        (l: any) =>
          l.name.toLowerCase().includes("glory") || l.name.toLowerCase().includes("warehouse")
      ) ||
      locations[0] ||
      null
  } catch {}

  const autoCreatedBreweries: string[] = []
  const autoCreatedHops: string[] = []

  // Brewery resolver: returns brewery object or null
  async function resolveBrewery(name: string): Promise<any | null> {
    const key = name.toLowerCase()
    if (breweryMap.has(key)) return breweryMap.get(key)
    if (!autoCreateBreweries) return null
    if (dryRun) {
      if (!autoCreatedBreweries.includes(name)) autoCreatedBreweries.push(name)
      const stub = { id: `__pending__:${key}`, name, slug: slugify(name), is_active: true }
      breweryMap.set(key, stub)
      return stub
    }
    const { result: breweryResult } = await createBreweryWorkflow(req.scope).run({
      input: { name, slug: slugify(name), is_active: true },
    })
    const brewery = Array.isArray(breweryResult) ? breweryResult[0] : breweryResult
    breweryMap.set(key, brewery)
    autoCreatedBreweries.push(name)
    logger.info(`[CSV Import] Auto-created brewery "${name}"`)
    return brewery
  }

  // Hop resolver: returns hop object or null
  async function resolveHop(name: string): Promise<any | null> {
    const key = name.toLowerCase()
    if (hopMap.has(key)) return hopMap.get(key)
    if (!autoCreateHops) return null
    if (dryRun) {
      if (!autoCreatedHops.includes(name)) autoCreatedHops.push(name)
      const stub = { id: `__pending__:${key}`, name, slug: slugify(name), is_active: false }
      hopMap.set(key, stub)
      return stub
    }
    const { result: hopResult } = await createHopWorkflow(req.scope).run({
      input: { name, slug: slugify(name), is_active: false },
    })
    const hop = Array.isArray(hopResult) ? hopResult[0] : hopResult
    hopMap.set(key, hop)
    autoCreatedHops.push(name)
    logger.info(`[CSV Import] Auto-created hop "${name}" (draft)`)
    return hop
  }

  // Apply stocked_quantity to the first variant of a product. Finds or creates
  // the inventory level for the default warehouse, then sets stocked_quantity.
  async function applyStock(variantId: string, qty: number): Promise<void> {
    if (!defaultWarehouse) return
    try {
      const items = await inventoryModule.listInventoryItems({ variant_id: variantId })
      let item = items?.[0]
      if (!item) {
        // fall back: look up via SKU
        const variant = await productModule.retrieveProductVariant(variantId)
        if (variant?.sku) {
          const bySku = await inventoryModule.listInventoryItems({ sku: variant.sku })
          item = bySku?.[0]
        }
      }
      if (!item) {
        logger.warn(
          `[CSV Import] No inventory item found for variant ${variantId} — stock not updated`
        )
        return
      }
      const levels = await inventoryModule.listInventoryLevels({
        inventory_item_id: item.id,
        location_id: defaultWarehouse.id,
      })
      if (levels?.length) {
        await inventoryModule.updateInventoryLevels([{ id: levels[0].id, stocked_quantity: qty }]) // workflow-exempt
      } else {
        const newLevel = {
          inventory_item_id: item.id,
          location_id: defaultWarehouse.id,
          stocked_quantity: qty,
        }
        await inventoryModule.createInventoryLevels(newLevel) // workflow-exempt: bulk inventory import utility
      }
    } catch (err: any) {
      logger.warn(`[CSV Import] Stock update failed for variant ${variantId}: ${err.message}`)
    }
  }

  // Update the beer_style link for a product. Uses reverse traversal to find
  // existing links (query from beer_style side), dismisses them, then creates
  // the new link. No-op if styleName doesn't match any known style.
  async function applyBeerStyleLink(productId: string, styleName: string): Promise<void> {
    if (!styleName) return
    const style = styleMap.get(styleName.toLowerCase())
    if (!style) return

    try {
      // Dismiss all existing beer_style links for this product by traversing
      // from the beer_style side (avoids the "Entity Product has no property
      // beer_styles" error when querying from the product side).
      const { data: allStyles } = await query.graph({
        entity: "beer_style",
        fields: ["id", "products.id"],
      })
      for (const s of allStyles as any[]) {
        const isLinked = (s.products || []).some((p: any) => p.id === productId)
        if (isLinked) {
          try {
            await link.dismiss({
              [BEER_STYLE_MODULE]: { beer_style_id: s.id },
              [Modules.PRODUCT]: { product_id: productId },
            })
          } catch {}
        }
      }
      // Create the new link
      await link.create({
        [BEER_STYLE_MODULE]: { beer_style_id: style.id },
        [Modules.PRODUCT]: { product_id: productId },
      })
    } catch (err: any) {
      logger.warn(`[CSV Import] Beer style link failed for ${productId}: ${err.message}`)
    }
  }

  let created = 0
  let updated = 0
  const errors: string[] = []
  const wouldCreate: string[] = []
  const wouldUpdate: string[] = []
  // Per-row structured preview for the dry-run wizard
  type DryRunRow = {
    row: number
    name: string
    action: "create" | "update" | "error"
    messages: string[]
    changes?: Record<string, any>
  }
  const dryRunRows: DryRunRow[] = []
  let rowNum = 0

  for (const row of rows) {
    rowNum++
    const rowMsgs: string[] = []
    if (row.parseErrors.length > 0) {
      for (const e of row.parseErrors) errors.push(e)
      if (dryRun)
        dryRunRows.push({ row: rowNum, name: row.name, action: "error", messages: row.parseErrors })
      continue
    }
    try {
      // Validate release_at if provided
      let releaseAtIso: string | undefined
      if (row.release_at) {
        const ts = Date.parse(row.release_at)
        if (isNaN(ts)) {
          const m = `invalid release_at "${row.release_at}"`
          errors.push(`Row "${row.name}": ${m}`)
          if (dryRun)
            dryRunRows.push({ row: rowNum, name: row.name, action: "error", messages: [m] })
          continue
        }
        releaseAtIso = new Date(ts).toISOString()
      }

      // Resolve primary brewery
      const brewery = await resolveBrewery(row.brewery)
      if (!brewery) {
        const m = `brewery "${row.brewery}" not found (enable auto_create_breweries to create)`
        errors.push(`Row "${row.name}": ${m}`)
        if (dryRun) dryRunRows.push({ row: rowNum, name: row.name, action: "error", messages: [m] })
        continue
      }
      if (String(brewery.id).startsWith("__pending__")) {
        rowMsgs.push(`will create brewery "${brewery.name}"`)
      }

      // Resolve collab breweries (only when populated)
      const collabBreweries: any[] = []
      if (row.collab_breweries.length > 0) {
        for (const collabName of row.collab_breweries) {
          const cb = await resolveBrewery(collabName)
          if (!cb) {
            const m = `collab brewery "${collabName}" not found (enable auto_create_breweries to create)`
            errors.push(`Row "${row.name}": ${m}`)
            rowMsgs.push(m)
          } else {
            collabBreweries.push(cb)
          }
        }
      }

      // Resolve hops (only when populated)
      const resolvedHops: any[] = []
      if (row.hops.length > 0) {
        for (const hopName of row.hops) {
          const h = await resolveHop(hopName)
          if (!h) {
            const m = `hop "${hopName}" not found (enable auto_create_hops to create)`
            errors.push(`Row "${row.name}": ${m}`)
            rowMsgs.push(m)
          } else {
            resolvedHops.push(h)
          }
        }
      }

      // Look up existing product by handle (brewery-slug + product-slug) — the
      // same key used at create time (line ~652). Matching on title alone can
      // return a duplicate row and cause the update to target the wrong product.
      const handle = `${brewery.slug}-${slugify(row.name)}`
      const existingProducts = await productModule.listProducts(
        { handle },
        {
          // No explicit `select`: Medusa v2's query builder drops relations when
          // the select list omits the relation fields. Without select, all scalar
          // fields + the specified relations are returned, so variants is populated.
          relations: ["variants", "images"],
        }
      )
      const existing = existingProducts[0] ?? null

      const containerValue = row.container || "Can 440ml"

      // Build metadata patch. Write all canonical key variants so every
      // consumer (indexer, storefront fallback, seed-format readers) can find
      // the data regardless of which key they look up.
      const metaPatch: Record<string, any> = {
        // Brewery under both keys — search indexer reads meta.brewery
        brewery_name: brewery.name,
        brewery_slug: brewery.slug,
        brewery: brewery.name,
        // Container: write container_type (what TechnicalSpecs reads)
        container_type: containerValue,
        container: containerValue, // back-compat
        // Style: write both the friendly name and the canonical beer_style key
        style: row.style,
        abv: row.abv,
      }

      // Hops: write all key variants consumed by different parts of the app
      if (row.hops.length > 0) {
        const hopNames = resolvedHops.map((h) => h.name)
        const hopSlugs = resolvedHops.map((h) => h.slug || slugify(h.name))
        metaPatch.hops = hopNames // TechnicalSpecs + search indexer fallback
        metaPatch.hop_names = hopNames // seed format consumers
        metaPatch.hop_slugs = hopSlugs // slug-based lookups
      }

      // Beer style derived keys — written on create and update so the full
      // metadata matches what the seed writes.
      if (row.style) {
        const matchedStyle = styleMap.get(row.style.toLowerCase())
        if (matchedStyle) {
          metaPatch.beer_style = matchedStyle.name
          metaPatch.beer_style_slug = matchedStyle.slug
          metaPatch.beer_style_family = matchedStyle.family
        } else {
          errors.push(`Row "${row.name}": style "${row.style}" not found — link skipped`)
          rowMsgs.push(`style "${row.style}" not found — link skipped`)
        }
      }

      // volume_ml
      if (row.volume_ml) {
        const ml = parseFloat(row.volume_ml)
        if (!isNaN(ml)) metaPatch.volume_ml = ml
      }

      // release_at: write both keys for full compatibility
      if (releaseAtIso) {
        metaPatch.release_at = releaseAtIso
        metaPatch.early_access_until = releaseAtIso // back-compat
      }
      if (row.is_anniversary !== undefined) {
        metaPatch.is_anniversary = row.is_anniversary
      }
      if (Object.keys(row.extras).length > 0) {
        metaPatch.import_extras = row.extras
      }

      // Parse stock quantity (shared by both create and update paths)
      const stockQty = row.stock ? parseInt(row.stock, 10) : NaN

      // Build images patch
      const images = row.images.map((url) => ({ url }))
      const thumbnail = row.images[0]

      if (existing) {
        if (dryRun) {
          wouldUpdate.push(row.name)
          dryRunRows.push({
            row: rowNum,
            name: row.name,
            action: "update",
            messages: rowMsgs,
            changes: {
              price: row.price,
              style: row.style,
              abv: row.abv,
              brewery: brewery.name,
              stock: !isNaN(stockQty) ? stockQty : undefined,
              container: containerValue,
            },
          })
          continue
        }

        // Update product variant price + product metadata/images via a
        // compensatable workflow — rolls back both if either step fails.
        const variant = existing.variants?.[0]
        if (variant) {
          const updateInput: Record<string, any> = {
            description:
              row.description?.trim() ||
              `${row.style} — ${row.abv}% ABV. Brewed by ${brewery.name}`,
            metadata: { ...existing.metadata, ...metaPatch },
          }
          if (row.images.length > 0) {
            updateInput.images = images
            updateInput.thumbnail = thumbnail
          }
          await updateImportedProductWorkflow(req.scope).run({
            input: {
              product_id: existing.id,
              variant_id: variant.id,
              price_aud: parseFloat(row.price) || 0,
              product_update: updateInput,
            },
          })
        }

        // Hops links: clear all existing links then add the new set so the
        // result is always exactly what the CSV says (not accumulated).
        if (row.hops.length > 0) {
          // Dismiss existing hop links
          try {
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
          } catch {}

          // Add the new hop links
          for (const h of resolvedHops) {
            try {
              await link.create({
                [HOP_MODULE]: { hop_id: h.id },
                [Modules.PRODUCT]: { product_id: existing.id },
              })
            } catch (err: any) {
              if (!err.message?.includes("already exists") && !err.message?.includes("duplicate")) {
                logger.warn(
                  `[CSV Import] Hop link ${h.name} → ${existing.id} failed: ${err.message}`
                )
              }
            }
          }
        }

        // Beer style link: replace existing link with the one from this row
        if (row.style) {
          await applyBeerStyleLink(existing.id, row.style)
        }

        // Collab brewery links: only touch when populated
        if (row.collab_breweries.length > 0) {
          for (const cb of collabBreweries) {
            try {
              await link.create({
                brewery: { brewery_id: cb.id },
                [Modules.PRODUCT]: { product_id: existing.id },
              })
            } catch (err: any) {
              if (!err.message?.includes("already exists") && !err.message?.includes("duplicate")) {
                logger.warn(
                  `[CSV Import] Collab link ${cb.name} → ${existing.id} failed: ${err.message}`
                )
              }
            }
          }
        }

        // Ensure SC link on existing products
        if (defaultChannel) {
          try {
            await link.create({
              [Modules.PRODUCT]: { product_id: existing.id },
              [Modules.SALES_CHANNEL]: { sales_channel_id: defaultChannel.id },
            })
          } catch (err: any) {
            if (!err.message?.includes("already exists") && !err.message?.includes("duplicate")) {
              logger.warn(`[CSV Import] SC link on update: ${err.message}`)
            }
          }
        }

        // Stock update
        if (!isNaN(stockQty) && stockQty >= 0 && variant) {
          await applyStock(variant.id, stockQty)
        }

        // Trigger reindex for all updated fields
        try {
          const eventBus = req.scope.resolve(Modules.EVENT_BUS) as any
          if (eventBus?.emit) {
            await eventBus.emit([{ name: "product.updated", data: { id: existing.id } }])
          }
        } catch {}

        updated++
      } else {
        if (dryRun) {
          wouldCreate.push(row.name)
          dryRunRows.push({
            row: rowNum,
            name: row.name,
            action: "create",
            messages: rowMsgs,
            changes: {
              price: row.price,
              style: row.style,
              abv: row.abv,
              brewery: brewery.name,
              stock: !isNaN(stockQty) ? stockQty : undefined,
              container: containerValue,
            },
          })
          continue
        }

        const productInput: Record<string, any> = {
          title: row.name,
          handle,
          description:
            row.description?.trim() || `${row.style} — ${row.abv}% ABV. Brewed by ${brewery.name}`,
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
        }
        // Note: createProductsWorkflow ignores sales_channels input (Medusa v2 limitation).
        // SC link is created explicitly after the workflow completes.
        if (row.images.length > 0) {
          productInput.images = images
          productInput.thumbnail = thumbnail
        }

        const { result: products } = await createProductsWorkflow(req.scope).run({
          input: { products: [productInput as any] },
        })

        const productId = products?.[0]?.id
        const newVariant = products?.[0]?.variants?.[0]
        if (productId) {
          // Primary brewery link
          await link.create({
            brewery: { brewery_id: brewery.id },
            [Modules.PRODUCT]: { product_id: productId },
          })

          // SC link (explicit — createProductsWorkflow ignores sales_channels input)
          if (defaultChannel) {
            try {
              await link.create({
                [Modules.PRODUCT]: { product_id: productId },
                [Modules.SALES_CHANNEL]: { sales_channel_id: defaultChannel.id },
              })
            } catch (err: any) {
              if (!err.message?.includes("already exists")) {
                logger.warn(`[CSV Import] SC link: ${err.message}`)
              }
            }
          }

          // Collab brewery links
          if (collabBreweries.length > 0) {
            for (const cb of collabBreweries) {
              try {
                await link.create({
                  brewery: { brewery_id: cb.id },
                  [Modules.PRODUCT]: { product_id: productId },
                })
              } catch (err: any) {
                if (
                  !err.message?.includes("already exists") &&
                  !err.message?.includes("duplicate")
                ) {
                  logger.warn(
                    `[CSV Import] Collab link ${cb.name} → ${productId} failed: ${err.message}`
                  )
                }
              }
            }
          }

          // Hop links
          for (const h of resolvedHops) {
            try {
              await link.create({
                [HOP_MODULE]: { hop_id: h.id },
                [Modules.PRODUCT]: { product_id: productId },
              })
            } catch (err: any) {
              if (!err.message?.includes("already exists") && !err.message?.includes("duplicate")) {
                logger.warn(`[CSV Import] Hop link ${h.name} → ${productId} failed: ${err.message}`)
              }
            }
          }

          // Beer style link
          if (row.style) {
            await applyBeerStyleLink(productId, row.style)
          }

          // Stock — set after createProductsWorkflow so the inventory item exists
          if (!isNaN(stockQty) && stockQty >= 0 && newVariant) {
            // Small delay to let createProductsWorkflow's inventory setup complete
            await new Promise((r) => setTimeout(r, 200))
            await applyStock(newVariant.id, stockQty)
          }

          // Re-trigger reindex now that all links exist. product.created fires
          // before brewery/hop links are created so the search index needs a
          // refresh with the complete link set.
          try {
            const eventBus = req.scope.resolve(Modules.EVENT_BUS) as any
            if (eventBus?.emit) {
              await eventBus.emit([{ name: "product.updated", data: { id: productId } }])
            }
          } catch {}
        }

        created++
      }
    } catch (err: any) {
      errors.push(`Row "${row.name}": ${err.message}`)
      if (dryRun)
        dryRunRows.push({ row: rowNum, name: row.name, action: "error", messages: [err.message] })
    }
  }

  if (dryRun) {
    logger.info(
      `[CSV Import dry-run] would create=${wouldCreate.length}, would update=${wouldUpdate.length}, errors=${errors.length}`
    )
    return res.json({
      dry_run: true,
      would_create: wouldCreate.length,
      would_update: wouldUpdate.length,
      would_create_titles: wouldCreate,
      would_update_titles: wouldUpdate,
      would_auto_create_breweries: autoCreatedBreweries,
      would_auto_create_hops: autoCreatedHops,
      errors,
      rows: dryRunRows,
      total: rows.length,
    })
  }

  logger.info(
    `[CSV Import] ${created} created, ${updated} updated, ${errors.length} errors, ` +
      `auto-created ${autoCreatedBreweries.length} breweries / ${autoCreatedHops.length} hops`
  )

  res.json({
    created,
    updated,
    errors,
    auto_created_breweries: autoCreatedBreweries,
    auto_created_hops: autoCreatedHops,
    total: rows.length,
  })
}
