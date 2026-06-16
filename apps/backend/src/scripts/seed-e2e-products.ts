import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { createProductsWorkflow, createInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Idempotent seed for the Hops & Glory Playwright e2e suite.
 *
 * Creates four real-world craft breweries (Brujos / Tree House / Fidens /
 * Other Half), nine catalog products covering every storefront feature
 * (collab via real link table, anniversary tag, hops, ABV, beer-style), and
 * six VIP-window Tree House drops anchored to release_at offsets so each
 * tier sees a different early-access state. Re-running updates release_at
 * (and the derived early_access_until) on the existing handles.
 *
 * Three handles + prices are FROZEN — Playwright specs depend on them:
 *   e2e-test-pale-ale         $50  (purchase-payid-vip-credit.spec.ts)
 *   e2e-test-buy-now-stout    $80  (buy-now.spec.ts, vip-progression.spec.ts)
 *   e2e-test-pickup-lager     $50  (referral-attribution.spec.ts)
 *
 * Run order:
 *   pnpm exec medusa exec ./src/scripts/seed-vip-config.ts
 *   pnpm exec medusa exec ./src/scripts/seed-beer-styles.ts
 *   pnpm exec medusa exec ./src/scripts/seed-hops.ts
 *   pnpm exec medusa exec ./src/scripts/seed-e2e-products.ts
 */

const TARGET_STOCK_PER_LOCATION = 100
const CURRENCY = (process.env.DEFAULT_CURRENCY || "aud").toLowerCase()

type Brewery = {
  slug: string
  name: string
  location: string
  description: string
}

const BREWERIES: Brewery[] = [
  {
    slug: "brujos-brewing",
    name: "Brujos Brewing",
    location: "Yauco, Puerto Rico",
    description:
      "Latin-influenced experimental brewer from Puerto Rico. Hazy IPAs, bright fruit sours, tropical pales. Frequent collaborations across the US and Caribbean craft scene.",
  },
  {
    slug: "tree-house-brewing",
    name: "Tree House Brewing",
    location: "Charlton, Massachusetts",
    description:
      "Cult New England hazy IPA producer. Allocation-only releases, member drops, and reverent followings around flagship pours like Julius and Haze.",
  },
  {
    slug: "fidens-brewing",
    name: "Fidens Brewing",
    location: "Albany, New York",
    description:
      "Albany-based NEIPA and Double IPA specialist with frequent fresh-hop and one-off releases. Known for soft, expressive hop character and tight allocations.",
  },
  {
    slug: "other-half-brewing",
    name: "Other Half Brewing",
    location: "Brooklyn, New York",
    description:
      "Brooklyn brewery and prolific collaborator. Double-dry-hopped IPAs, the All Together series, and a long history of joint releases with hazy and West Coast peers.",
  },
]

type SeedProduct = {
  handle: string
  title: string
  description: string
  amount: number
  sku: string
  brewerySlug: string
  collabBrewerySlugs?: string[]
  beerStyleSlug?: string
  hopSlugs?: string[]
  abv?: number
  metadata?: Record<string, any>
  tags?: string[]
  releaseAt?: "NOW" | { hoursFromNow: number } | string
  beerDetail?: {
    untappdRating?: number
    hopProvenance?: string
    batchGroupId?: string
  }
}

const CATALOG: SeedProduct[] = [
  {
    handle: "e2e-test-pale-ale",
    title: "Brujos Sundial Pacific Ale",
    description:
      "A Galaxy and Motueka pacific ale with stone-fruit and lime aromatics. Built for sun and salt.",
    amount: 50,
    sku: "e2e-test-pale-ale",
    brewerySlug: "brujos-brewing",
    beerStyleSlug: "pacific-ale",
    hopSlugs: ["galaxy", "motueka"],
    abv: 4.8,
    beerDetail: {
      untappdRating: 4.0,
      hopProvenance: "AU/NZ",
    },
  },
  {
    handle: "e2e-test-buy-now-stout",
    title: "Tree House Cocoa Imperial Stout",
    description:
      "Layered cocoa, vanilla bean and molasses. Bottle-conditioned imperial stout aged on cacao nibs from a single Massachusetts batch.",
    amount: 80,
    sku: "e2e-test-buy-now-stout",
    brewerySlug: "tree-house-brewing",
    beerStyleSlug: "imperial-stout",
    abv: 10.2,
    beerDetail: {
      untappdRating: 4.3,
      batchGroupId: "winter-2026",
    },
  },
  {
    handle: "e2e-test-pickup-lager",
    title: "Fidens Frühjahr Crisp Lager",
    description: "A clean, crackery hop-noble lager. Brewed for shelf life and the long pour.",
    amount: 50,
    sku: "e2e-test-pickup-lager",
    brewerySlug: "fidens-brewing",
    beerStyleSlug: "lager",
    hopSlugs: ["hallertau-mittelfruh"],
    abv: 4.4,
    beerDetail: {
      untappdRating: 3.9,
    },
  },
  {
    handle: "other-half-haze-engine",
    title: "Other Half Haze Engine",
    description:
      "Triple-dry-hopped NEIPA. Citra, Mosaic and Nelson Sauvin layered over a soft oat body.",
    amount: 38,
    sku: "other-half-haze-engine",
    brewerySlug: "other-half-brewing",
    beerStyleSlug: "neipa",
    hopSlugs: ["citra", "mosaic", "nelson-sauvin"],
    abv: 6.8,
    beerDetail: {
      untappdRating: 4.2,
      hopProvenance: "USA / NZ",
    },
  },
  {
    handle: "fidens-west-coast-redux",
    title: "Fidens West Coast Redux",
    description:
      "A pithy, piney West Coast IPA with grapefruit and pine resin. Dry, bracing, true-to-style.",
    amount: 38,
    sku: "fidens-west-coast-redux",
    brewerySlug: "fidens-brewing",
    beerStyleSlug: "west-coast-ipa",
    hopSlugs: ["simcoe", "centennial", "columbus"],
    abv: 7.0,
    beerDetail: {
      untappdRating: 4.1,
    },
  },
  {
    handle: "brujos-stone-fruit-sour",
    title: "Brujos Stone-Fruit Sour",
    description: "Kettle sour with apricot and white peach. Tart, fluffy, and softly fruited.",
    amount: 42,
    sku: "brujos-stone-fruit-sour",
    brewerySlug: "brujos-brewing",
    beerStyleSlug: "fruit-sour",
    abv: 5.2,
    beerDetail: {
      untappdRating: 4.0,
    },
  },
  {
    handle: "tree-house-x-other-half-tropic-thunder",
    title: "Tropic Thunder — Tree House × Other Half",
    description:
      "A tropical NEIPA collaboration. Galaxy, Citra, and Sabro layered into a soft, juicy core. Limited release.",
    amount: 48,
    sku: "tree-house-x-other-half-tropic-thunder",
    brewerySlug: "tree-house-brewing",
    collabBrewerySlugs: ["other-half-brewing"],
    beerStyleSlug: "neipa",
    hopSlugs: ["galaxy", "citra", "sabro"],
    abv: 7.4,
    metadata: {
      collab_partner: "Other Half Brewing",
      collab_partners: ["other-half-brewing"],
    },
    beerDetail: {
      untappdRating: 4.4,
      hopProvenance: "USA / AU",
    },
  },
  {
    handle: "tree-house-tenth-anniversary",
    title: "Tree House Tenth Anniversary IPA",
    description:
      "Anniversary brew. Galaxy, Mosaic, and Idaho 7 in a Double IPA built around the brewery's house yeast.",
    amount: 65,
    sku: "tree-house-tenth-anniversary",
    brewerySlug: "tree-house-brewing",
    beerStyleSlug: "double-ipa",
    hopSlugs: ["galaxy", "mosaic", "idaho-7"],
    abv: 8.4,
    tags: ["anniversary"],
    metadata: {
      collab_note: "Tenth anniversary brew",
    },
    beerDetail: {
      untappdRating: 4.5,
      batchGroupId: "anniversary-x",
    },
  },
  {
    handle: "fidens-fresh-hop-harvest",
    title: "Fidens Fresh-Hop Harvest",
    description: "Wet-hop NEIPA brewed within hours of the harvest. Soft, green, and bright.",
    amount: 44,
    sku: "fidens-fresh-hop-harvest",
    brewerySlug: "fidens-brewing",
    beerStyleSlug: "neipa",
    hopSlugs: ["citra", "simcoe"],
    abv: 6.4,
    releaseAt: "NOW",
    beerDetail: {
      untappdRating: 4.2,
      hopProvenance: "USA — wet hop",
    },
  },
]

const VIP_WINDOW: SeedProduct[] = [
  {
    handle: "tree-house-galactic-drift",
    title: "Tree House Galactic Drift",
    description:
      "A new-cycle NEIPA dropping today. Soft body, dense hop charge, and a bright tropical finish.",
    amount: 55,
    sku: "tree-house-galactic-drift",
    brewerySlug: "tree-house-brewing",
    beerStyleSlug: "neipa",
    hopSlugs: ["citra", "galaxy"],
    abv: 7.0,
    releaseAt: "NOW",
    beerDetail: { untappdRating: 4.3 },
  },
  {
    handle: "tree-house-nimbus",
    title: "Tree House Nimbus",
    description: "Mosaic-forward NEIPA. Berry, peach, and lifted pine over a pillowy oat base.",
    amount: 55,
    sku: "tree-house-nimbus",
    brewerySlug: "tree-house-brewing",
    beerStyleSlug: "neipa",
    hopSlugs: ["mosaic", "amarillo"],
    abv: 7.0,
    releaseAt: { hoursFromNow: -12 },
    beerDetail: { untappdRating: 4.3 },
  },
  {
    handle: "tree-house-cellar-reserve",
    title: "Tree House Cellar Reserve",
    description: "Cellar-aged NEIPA hand-picked from the most balanced ferments of the season.",
    amount: 55,
    sku: "tree-house-cellar-reserve",
    brewerySlug: "tree-house-brewing",
    beerStyleSlug: "neipa",
    hopSlugs: ["citra", "nelson-sauvin"],
    abv: 7.0,
    releaseAt: { hoursFromNow: -18 },
    beerDetail: { untappdRating: 4.4 },
  },
  {
    handle: "tree-house-solstice",
    title: "Tree House Solstice",
    description: "Bright, sunny NEIPA brewed for the longest day. Galaxy and Sabro lead.",
    amount: 55,
    sku: "tree-house-solstice",
    brewerySlug: "tree-house-brewing",
    beerStyleSlug: "neipa",
    hopSlugs: ["galaxy", "sabro"],
    abv: 7.0,
    releaseAt: { hoursFromNow: -21 },
    beerDetail: { untappdRating: 4.2 },
  },
  {
    handle: "tree-house-quintessence",
    title: "Tree House Quintessence",
    description: "Year-round flagship NEIPA. The brewery's most-poured pint.",
    amount: 55,
    sku: "tree-house-quintessence",
    brewerySlug: "tree-house-brewing",
    beerStyleSlug: "neipa",
    hopSlugs: ["citra", "mosaic"],
    abv: 7.0,
    releaseAt: { hoursFromNow: -25 },
    beerDetail: { untappdRating: 4.4 },
  },
  {
    handle: "tree-house-aurora-prelude",
    title: "Tree House Aurora Prelude",
    description: "Future-dated drop. Will release exactly one week from seed time.",
    amount: 55,
    sku: "tree-house-aurora-prelude",
    brewerySlug: "tree-house-brewing",
    beerStyleSlug: "neipa",
    hopSlugs: ["nelson-sauvin", "motueka"],
    abv: 7.0,
    releaseAt: { hoursFromNow: 168 },
    beerDetail: { untappdRating: 4.3 },
  },
]

const ALL_PRODUCTS: SeedProduct[] = [...CATALOG, ...VIP_WINDOW]

function resolveReleaseAt(input?: SeedProduct["releaseAt"]): Date | null {
  if (!input) return null
  if (input === "NOW") return new Date()
  if (typeof input === "string") return new Date(input)
  return new Date(Date.now() + input.hoursFromNow * 3600 * 1000)
}

export default async function seedE2eProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const productModule = container.resolve(Modules.PRODUCT) as any
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL) as any
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION) as any
  const inventoryModule = container.resolve(Modules.INVENTORY) as any
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT) as any
  const breweryService = container.resolve("brewery") as any
  const beerDetailService = container.resolve("beerDetail") as any
  const beerStyleService = container.resolve("beerStyle") as any
  const hopService = container.resolve("hop") as any

  logger.info("=== E2E PRODUCT SEED (Hops & Glory) ===")

  // -------------------------------------------------------------------------
  // 1. Prerequisites: sales channel, stock locations, shipping profile
  // -------------------------------------------------------------------------
  const salesChannels = await salesChannelModule.listSalesChannels({})
  if (!salesChannels.length) {
    throw new Error("No sales channel found. Run base seed first (just bootstrap).")
  }
  const salesChannel = salesChannels[0]

  const stockLocations = await stockLocationModule.listStockLocations({})
  if (!stockLocations.length) {
    throw new Error("No stock location found. Run base seed first (just bootstrap).")
  }
  logger.info(`Stocking ${stockLocations.length} location(s) per product`)

  const [shippingProfile] = await fulfillmentModule.listShippingProfiles()
  if (!shippingProfile) {
    throw new Error("No shipping profile found. Run base seed first (just bootstrap).")
  }

  const beerStyleCount = (await beerStyleService.listBeerStyles({})).length
  if (beerStyleCount === 0) {
    logger.warn(
      "[seed-e2e] beer_style table is empty — beer-style links will be skipped. Run seed-beer-styles.ts."
    )
  }
  const hopCount = (await hopService.listHops({})).length
  if (hopCount === 0) {
    logger.warn("[seed-e2e] hop table is empty — hop links will be skipped. Run seed-hops.ts.")
  }

  // -------------------------------------------------------------------------
  // 2. Breweries (find-or-create)
  // -------------------------------------------------------------------------
  const breweryBySlug: Record<string, any> = {}
  for (const b of BREWERIES) {
    let [row] = await breweryService.listBreweries({ slug: b.slug })
    if (!row) {
      row = await breweryService.createBreweries({
        name: b.name,
        slug: b.slug,
        location: b.location,
        description: b.description,
      })
      logger.info(`  Created brewery ${b.name} (${row.id})`)
    }
    breweryBySlug[b.slug] = row
  }

  // -------------------------------------------------------------------------
  // 3. Helpers for link resolution
  // -------------------------------------------------------------------------
  async function resolveBeerStyle(slug?: string): Promise<any | null> {
    if (!slug || beerStyleCount === 0) return null
    const [row] = await beerStyleService.listBeerStyles({ slug })
    if (!row) {
      logger.warn(`  beer_style ${slug} not found — link skipped`)
      return null
    }
    return row
  }
  async function resolveHops(slugs?: string[]): Promise<any[]> {
    if (!slugs?.length || hopCount === 0) return []
    const out: any[] = []
    for (const s of slugs) {
      const [row] = await hopService.listHops({ slug: s })
      if (row) out.push(row)
      else logger.warn(`  hop ${s} not found — link skipped`)
    }
    return out
  }
  async function safeLink(payload: any) {
    try {
      await link.create(payload)
    } catch (e: any) {
      if (!e.message?.includes("already exists")) {
        // Existing pattern: swallow already-exists, surface anything else as warn
        logger.warn(`  Link skipped: ${e.message}`)
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. Products: find-or-create, patch metadata, ensure links + beer_detail
  // -------------------------------------------------------------------------
  for (const sp of ALL_PRODUCTS) {
    const releaseAt = resolveReleaseAt(sp.releaseAt)
    const earlyAccessUntil = releaseAt ? new Date(releaseAt.getTime() + 24 * 3600 * 1000) : null

    const isCollab = !!sp.collabBrewerySlugs?.length
    const hostBrewery = breweryBySlug[sp.brewerySlug]
    const collabBreweryRows = (sp.collabBrewerySlugs || [])
      .map((s) => breweryBySlug[s])
      .filter(Boolean)
    const beerStyleRow = await resolveBeerStyle(sp.beerStyleSlug)
    const hopRows = await resolveHops(sp.hopSlugs)

    const builtMetadata: Record<string, any> = {
      ...(sp.metadata || {}),
      e2e_test: true,
    }
    if (typeof sp.abv === "number") builtMetadata.abv = sp.abv
    if (releaseAt) {
      builtMetadata.release_at = releaseAt.toISOString()
      builtMetadata.early_access_until = earlyAccessUntil!.toISOString()
    }
    // canned/packaged date — drives freshness column on store list and the
    // "Canned:" line on the PDP. Deterministic per handle so re-runs stay
    // stable; spread 5..60 days into the past for a varied freshness display.
    {
      let h = 0
      for (let i = 0; i < sp.handle.length; i++) h = (h * 31 + sp.handle.charCodeAt(i)) | 0
      const packagedDaysAgo = 5 + (Math.abs(h) % 56)
      const packagedAt = new Date(Date.now() - packagedDaysAgo * 24 * 3600 * 1000)
      builtMetadata.packaged_at = packagedAt.toISOString()
    }
    // is_collab is derived at render time from breweries.length > 1 — no metadata flag needed
    if (hostBrewery) {
      builtMetadata.brewery_id = hostBrewery.id
      builtMetadata.brewery_slug = hostBrewery.slug
      builtMetadata.brewery_name = hostBrewery.name
    }
    if (collabBreweryRows.length) {
      builtMetadata.collab_partners = collabBreweryRows.map((b) => b.slug)
      if (!builtMetadata.collab_partner) {
        builtMetadata.collab_partner = collabBreweryRows[0].name
      }
    }
    if (beerStyleRow) {
      builtMetadata.beer_style_slug = beerStyleRow.slug
      builtMetadata.beer_style = beerStyleRow.name
      builtMetadata.beer_style_family = beerStyleRow.family
    }
    if (hopRows.length) {
      builtMetadata.hop_slugs = hopRows.map((h) => h.slug)
      builtMetadata.hop_names = hopRows.map((h) => h.name)
    }

    let [existing] = await productModule.listProducts({ handle: sp.handle })

    if (!existing) {
      const { result: created } = await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: sp.title,
              handle: sp.handle,
              description: sp.description,
              status: ProductStatus.PUBLISHED,
              metadata: builtMetadata,
              options: [{ title: "Format", values: ["Can"] }],
              variants: [
                {
                  title: `${sp.title} — Can`,
                  sku: sp.sku,
                  manage_inventory: true,
                  weight: 500,
                  prices: [{ currency_code: CURRENCY, amount: sp.amount }],
                  options: { Format: "Can" },
                },
              ],
              sales_channels: [{ id: salesChannel.id }],
            },
          ],
        },
      })
      existing = created[0]
      logger.info(`  Created product ${sp.handle} (${existing.id})`)
    } else {
      const merged = {
        ...((existing.metadata || {}) as Record<string, any>),
        ...builtMetadata,
      }
      await productModule.updateProducts(existing.id, {
        title: sp.title,
        description: sp.description,
        metadata: merged,
      })
      logger.info(`  Updated product ${sp.handle} (${existing.id})`)
    }

    // Explicitly link to the sales channel on every run. createProductsWorkflow
    // should handle this, but the Admin API does not process sales_channels on
    // creation, so we always ensure the link exists as a defensive measure.
    await safeLink({
      [Modules.PRODUCT]: { product_id: existing.id },
      [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannel.id },
    })

    // Tags (anniversary + any others) — find-or-create, attach
    if (sp.tags?.length) {
      const tagRows: any[] = []
      for (const tagValue of sp.tags) {
        const [t] = await productModule.listProductTags({ value: tagValue })
        const row = t ?? (await productModule.createProductTags({ value: tagValue }))
        tagRows.push(row)
      }
      await productModule.updateProducts(existing.id, {
        tags: tagRows.map((t) => ({ id: t.id })),
      })
    }

    // Brewery / beer-style / hop link tables now reflect the corrected
    // cardinalities (many breweries per product for collabs, one style per product,
    // many hops per product).
    if (hostBrewery) {
      await safeLink({
        brewery: { brewery_id: hostBrewery.id },
        [Modules.PRODUCT]: { product_id: existing.id },
      })
    }

    // Link collab breweries so storefront/search derive isCollab from breweries.length > 1
    for (const cb of collabBreweryRows) {
      await safeLink({
        brewery: { brewery_id: cb.id },
        [Modules.PRODUCT]: { product_id: existing.id },
      })
    }

    if (beerStyleRow) {
      await safeLink({
        beerStyle: { beer_style_id: beerStyleRow.id },
        [Modules.PRODUCT]: { product_id: existing.id },
      })
    }

    for (const h of hopRows) {
      await safeLink({
        hop: { hop_id: h.id },
        [Modules.PRODUCT]: { product_id: existing.id },
      })
    }

    await safeLink({
      [Modules.PRODUCT]: { product_id: existing.id },
      [Modules.FULFILLMENT]: { shipping_profile_id: shippingProfile.id },
    })

    // Beer-detail row + link (one-to-one)
    const detailFields = {
      product_id: existing.id,
      untappd_rating: sp.beerDetail?.untappdRating ?? null,
      hop_provenance: sp.beerDetail?.hopProvenance ?? null,
      batch_group_id: sp.beerDetail?.batchGroupId ?? null,
      enrichment_status: "seeded",
    }
    const [existingDetail] = await beerDetailService.listBeerDetails({
      product_id: existing.id,
    })
    if (existingDetail) {
      await beerDetailService.updateBeerDetails({
        selector: { id: existingDetail.id },
        data: detailFields,
      })
    } else {
      const created = await beerDetailService.createBeerDetails(detailFields)
      const detailRow = Array.isArray(created) ? created[0] : created
      await safeLink({
        beerDetail: { beer_detail_id: detailRow.id },
        [Modules.PRODUCT]: { product_id: existing.id },
      })
    }
  }

  // -------------------------------------------------------------------------
  // 5. Inventory: ensure TARGET_STOCK_PER_LOCATION at every stock location
  // -------------------------------------------------------------------------
  const skus = ALL_PRODUCTS.map((p) => p.sku)
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: [
      "id",
      "sku",
      "location_levels.id",
      "location_levels.location_id",
      "location_levels.stocked_quantity",
    ],
    filters: { sku: skus },
  })

  const newLevels: Array<{
    inventory_item_id: string
    location_id: string
    stocked_quantity: number
  }> = []

  for (const item of inventoryItems as any[]) {
    const existingByLocation = new Map<string, any>()
    for (const lvl of item.location_levels || []) {
      existingByLocation.set(lvl.location_id, lvl)
    }
    for (const loc of stockLocations) {
      const existing = existingByLocation.get(loc.id)
      if (existing) {
        if ((existing.stocked_quantity ?? 0) < TARGET_STOCK_PER_LOCATION) {
          await inventoryModule.updateInventoryLevels([
            {
              id: existing.id,
              stocked_quantity: TARGET_STOCK_PER_LOCATION,
            } as any,
          ])
        }
      } else {
        newLevels.push({
          inventory_item_id: item.id,
          location_id: loc.id,
          stocked_quantity: TARGET_STOCK_PER_LOCATION,
        })
      }
    }
  }

  if (newLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: newLevels },
    })
    logger.info(`  Created ${newLevels.length} inventory levels`)
  }

  logger.info(
    `=== E2E PRODUCT SEED COMPLETE: ${ALL_PRODUCTS.length} products / ${BREWERIES.length} breweries ===`
  )
}
