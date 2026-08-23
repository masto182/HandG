/**
 * One-off: create a handful of demo products in staging, sourced from real
 * recent production beers (title/description/image/hops/brewery/ABV/style),
 * so the New Drops queue has fresh content to review end-to-end.
 *
 * Fresh IDs are generated (staging is a separate DB from prod - no ID
 * collision risk). Reuses prod's public image URLs directly (served from
 * hopsandglory.au, publicly reachable regardless of which env references
 * them). Creates any missing brewery by name (mirrors import-us-beers.ts).
 * After creating each product, enqueues it into new_drop_queue directly
 * (mirrors what the product.created subscriber would do) rather than
 * relying on createProductsWorkflow to emit an event we then have to trust.
 *
 * Dry-run by default - prints what it would create.
 *
 * Usage (run ON the staging box, inside the backend container):
 *   ./node_modules/.bin/medusa exec ./src/scripts/import-demo-beers-from-prod.ts
 *   DRY_RUN=false ./node_modules/.bin/medusa exec ./src/scripts/import-demo-beers-from-prod.ts
 */
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { HOP_MODULE } from "../modules/hop"
import { NEW_DROP_BATCH_MODULE } from "../modules/new-drop-batch"

type DemoBeer = {
  title: string
  handle: string
  thumbnail: string
  breweryNames: string[]
  hopNames: string[]
  abv: number
  style: string
  container: string
  volumeMl: number
  weight: number
  priceAud: number
  sourceProductId: string
}

// Sourced from production (hopsandglory.au) on 2026-08-23 - most recent
// published beers at the time, picked for brewery/hop variety.
const DEMO_BEERS: DemoBeer[] = [
  {
    title: "TDH Placing Flowers w/ Pineapple",
    handle: "fidens-tdh-placing-flowers-w-pineapple-demo",
    thumbnail:
      "https://hopsandglory.au/files/fidens-tdh-placing-flowers-w-pineapple-01M0E8VRCMT9HAEXQDF7S3WKQK.jpg",
    breweryNames: ["Fidens"],
    hopNames: ["Citra", "Nelson Sauvin", "Peacharine"],
    abv: 10,
    style: "TDH Triple IPA",
    container: "Crowler 950ml",
    volumeMl: 950,
    weight: 1100,
    priceAud: 95,
    sourceProductId: "prod_01M0E7QSA13CHTECYJXHBQW2BE",
  },
  {
    title: "Standing in a Room w/ Pineapple",
    handle: "fidens-standing-in-a-room-w-pineapple-demo",
    thumbnail:
      "https://hopsandglory.au/files/fidens-standing-in-a-room-w-pineapple-01M0E8VQAZRWRY052CK3VSZES6.jpg",
    breweryNames: ["Fidens", "Living Haus"],
    hopNames: ["Nelson Sauvin", "Riwaka"],
    abv: 10,
    style: "Triple IPA",
    container: "Crowler 950ml",
    volumeMl: 950,
    weight: 1100,
    priceAud: 95,
    sourceProductId: "prod_01M0E7QRYKGQZB9NR6Z3T5DYBW",
  },
  {
    title: "A7Y7 X Floc. X Rivington",
    handle: "messorem-a7y7-x-floc-x-rivington-demo",
    thumbnail:
      "https://hopsandglory.au/files/messorem-a7y7-x-floc-x-rivington-01M07ED4QKG9NQ9HAVAX355PKZ.jpg",
    breweryNames: ["Messorem", "Floc", "Rivington"],
    hopNames: [],
    abv: 7.5,
    style: "NEIPA",
    container: "Can 473ml",
    volumeMl: 473,
    weight: 500,
    priceAud: 32,
    sourceProductId: "prod_01M07CWKDCY5K0GB493GM50X8Y",
  },
  {
    title: "A7Y7 X Lyric",
    handle: "messorem-a7y7-x-lyric-demo",
    thumbnail: "https://hopsandglory.au/files/messorem-a7y7-x-lyric-01M07ED4X9SY39XAH7AR4CMTTH.jpg",
    breweryNames: ["Messorem", "Lyric"],
    hopNames: [],
    abv: 8.1,
    style: "Double NEIPA",
    container: "Can 473ml",
    volumeMl: 473,
    weight: 500,
    priceAud: 34,
    sourceProductId: "prod_01M07CWKDC99DA2A2GR28WF96P",
  },
]

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export default async function importDemoBeersFromProd({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT) as any
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
  const inventoryModule = container.resolve(Modules.INVENTORY) as any
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const breweryService = container.resolve("brewery") as any
  const hopService = container.resolve(HOP_MODULE) as any
  const queueService = container.resolve(NEW_DROP_BATCH_MODULE) as any

  const dryRun = process.env.DRY_RUN !== "false"
  logger.info(`[ImportDemoBeers] Starting (${dryRun ? "DRY RUN" : "COMMIT"})...`)

  const existing = await productModule.listProducts({ handle: DEMO_BEERS.map((b) => b.handle) })
  if (existing.length) {
    logger.info(
      `[ImportDemoBeers] Already exist, skipping: ${existing.map((p: any) => p.handle).join(", ")}`
    )
  }
  const existingHandles = new Set(existing.map((p: any) => p.handle))
  const toCreate = DEMO_BEERS.filter((b) => !existingHandles.has(b.handle))

  if (!toCreate.length) {
    logger.info("[ImportDemoBeers] Nothing to create.")
    return
  }

  const allChannels = await salesChannelModule.listSalesChannels({})
  const salesChannel = allChannels.find(
    (c: any) => c.name.toLowerCase().includes("hops") || c.name.toLowerCase().includes("glory")
  )
  if (!salesChannel) {
    logger.error("[ImportDemoBeers] No H&G sales channel found - aborting.")
    return
  }

  const locations = await stockLocationModule.listStockLocations({})
  const warehouse =
    locations.find(
      (l: any) =>
        l.name.toLowerCase().includes("glory") || l.name.toLowerCase().includes("warehouse")
    ) || locations[0]

  const [defaultShippingProfile] = await fulfillmentModule.listShippingProfiles()

  const allHops = await hopService.listHops({})
  const hopByName = new Map<string, any>(allHops.map((h: any) => [h.name.toLowerCase(), h]))

  if (dryRun) {
    for (const b of toCreate) {
      logger.info(
        `[ImportDemoBeers] [dry run] Would create "${b.title}" (${b.handle}) - breweries: ${b.breweryNames.join(", ")}; hops: ${b.hopNames.join(", ") || "none"}; $${b.priceAud} AUD`
      )
    }
    logger.info("[ImportDemoBeers] Dry run complete - use DRY_RUN=false to commit")
    return
  }

  // Ensure all referenced breweries exist (create minimal rows for any that
  // don't - mirrors import-us-beers.ts's on-the-fly brewery creation).
  const allBreweryNames = [...new Set(toCreate.flatMap((b) => b.breweryNames))]
  const breweryByName = new Map<string, any>()
  for (const name of allBreweryNames) {
    const [b] = await breweryService.listBreweries({ name })
    if (b) {
      breweryByName.set(name, b)
      continue
    }
    const created = await breweryService.createBreweries({ name, slug: slugify(name) })
    breweryByName.set(name, created)
    logger.info(`[ImportDemoBeers] Created missing brewery: ${name}`)
  }

  const workflowInput = toCreate.map((b) => ({
    title: b.title,
    handle: b.handle,
    description: [b.style, `${b.abv}% ABV`, b.container].filter(Boolean).join(" · "),
    status: ProductStatus.PUBLISHED,
    thumbnail: b.thumbnail,
    images: [{ url: b.thumbnail }],
    metadata: {
      abv: b.abv,
      style: b.style,
      origin: "US",
      brewery: b.breweryNames[0],
      brewery_name: b.breweryNames[0],
      brewery_slug: slugify(b.breweryNames[0]),
      hop_names: b.hopNames.join(", "),
      container: b.container,
      volume_ml: b.volumeMl,
      demo_source_product_id: b.sourceProductId,
    },
    options: [{ title: "Format", values: [b.container.split(" ")[0]] }],
    variants: [
      {
        title: `${b.title} — ${b.container}`,
        sku: `demo-${slugify(b.title)}`.slice(0, 100),
        manage_inventory: true,
        weight: b.weight,
        prices: [{ currency_code: "aud", amount: b.priceAud }],
        options: { Format: b.container.split(" ")[0] },
      },
    ],
    sales_channels: [{ id: salesChannel.id }],
  }))

  const { result: products } = await createProductsWorkflow(container).run({
    input: { products: workflowInput as any },
  })

  for (let i = 0; i < products.length; i++) {
    const demo = toCreate[i]
    const product = products[i]
    logger.info(`[ImportDemoBeers] Created ${product.id} - ${product.title}`)

    for (const breweryName of demo.breweryNames) {
      const brewery = breweryByName.get(breweryName)
      if (!brewery) continue
      try {
        await link.create({
          brewery: { brewery_id: brewery.id },
          [Modules.PRODUCT]: { product_id: product.id },
        })
      } catch (e: any) {
        logger.warn(`[ImportDemoBeers] Brewery link failed for ${product.title}: ${e.message}`)
      }
    }

    for (const hopName of demo.hopNames) {
      const hop = hopByName.get(hopName.toLowerCase())
      if (!hop) {
        logger.warn(`[ImportDemoBeers] Hop "${hopName}" not found on this env - skipping link`)
        continue
      }
      try {
        await link.create({
          [HOP_MODULE]: { hop_id: hop.id },
          [Modules.PRODUCT]: { product_id: product.id },
        })
      } catch {
        // already linked
      }
    }

    if (defaultShippingProfile) {
      try {
        await link.create({
          [Modules.PRODUCT]: { product_id: product.id },
          [Modules.FULFILLMENT]: { shipping_profile_id: defaultShippingProfile.id },
        })
      } catch (e: any) {
        logger.warn(
          `[ImportDemoBeers] Shipping profile link failed for ${product.title}: ${e.message}`
        )
      }
    }

    if (warehouse) {
      try {
        const variantSku = workflowInput[i].variants[0].sku
        const items = await inventoryModule.listInventoryItems({ sku: variantSku })
        const item = items?.[0]
        if (item) {
          await inventoryModule.createInventoryLevels({
            inventory_item_id: item.id,
            location_id: warehouse.id,
            stocked_quantity: 24,
          })
        }
      } catch (e: any) {
        logger.warn(`[ImportDemoBeers] Stock setup failed for ${product.title}: ${e.message}`)
      }
    }

    // Enqueue for New Drops review - mirrors the product.created subscriber
    // rather than relying on the workflow to have emitted an event we then
    // have to trust fired the subscriber correctly.
    let breweryId: string | null = null
    let breweryDisplayName: string | null = demo.breweryNames[0] || null
    try {
      const { data } = await query.graph({
        entity: "product",
        fields: ["breweries.id", "breweries.name"],
        filters: { id: product.id },
      })
      const breweries = ((data?.[0] as any)?.breweries || []).filter((b: any) => b?.id)
      if (breweries[0]) {
        breweryId = breweries[0].id
        breweryDisplayName = breweries[0].name || breweryDisplayName
      }
    } catch {
      // fall back to metadata-derived name already set above
    }
    await queueService.createNewDropQueues({
      product_id: product.id,
      brewery_id: breweryId,
      brewery_name: breweryDisplayName,
      brewery_slug: slugify(demo.breweryNames[0] || ""),
      status: "pending",
      queued_at: new Date(),
      batch_id: null,
    })
    logger.info(`[ImportDemoBeers] Queued ${product.id} for New Drops review`)
  }

  logger.info(`[ImportDemoBeers] Done - created and queued ${products.length} demo product(s)`)
}
