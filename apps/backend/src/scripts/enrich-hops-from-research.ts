import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { HOP_MODULE } from "../modules/hop"
import * as fs from "fs"
import * as path from "path"

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

const NEW_HOPS = [
  { name: "Southern Cross", slug: "southern-cross", origin: "New Zealand", flavor_profile: "Spicy, pine, lemon, licorice" },
  { name: "Waimea", slug: "waimea", origin: "New Zealand - Nelson", flavor_profile: "Citrus, pine, tangelo, stone fruit" },
  { name: "Comet", slug: "comet", origin: "USA - Yakima Valley", flavor_profile: "Grapefruit, wild herbs, earthy" },
  { name: "Peacharine", slug: "peacharine", origin: "New Zealand", flavor_profile: "Peach, nectarine, stone fruit, tropical" },
  { name: "NZ Cascade", slug: "nz-cascade", origin: "New Zealand", flavor_profile: "Floral, citrus, grapefruit (NZ-grown variant)" },
  { name: "CTZ", slug: "ctz", origin: "USA - Yakima Valley", flavor_profile: "Herbal, earthy, pungent, citrus (Columbus/Tomahawk/Zeus)" },
  { name: "Tangier", slug: "tangier", origin: "USA", flavor_profile: "Tropical, citrus, floral" },
]

const HOP_NORMALIZATION: Record<string, string> = {
  "Nelson": "Nelson Sauvin",
  "Nelson Sauvin": "Nelson Sauvin",
  "NZ Cascade": "NZ Cascade",
  "Cascade": "Cascade",
  "CTZ": "CTZ",
  "Columbus": "Columbus",
}

export default async function enrichHopsFromResearch({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const hopService = container.resolve(HOP_MODULE) as any
  const productModule = container.resolve(Modules.PRODUCT)
  const link = container.resolve(ContainerRegistrationKeys.LINK) as any

  logger.info("[Hop Enrichment] Starting enrichment from research data...")

  const jsonPath = path.resolve(__dirname, "../../data/beer-hops-mapping.json")
  if (!fs.existsSync(jsonPath)) {
    logger.error(`[Hop Enrichment] Mapping file not found at ${jsonPath}`)
    return
  }

  const mapping = JSON.parse(fs.readFileSync(jsonPath, "utf-8"))
  logger.info(`[Hop Enrichment] Loaded ${mapping.length} beer entries from mapping`)

  logger.info("[Hop Enrichment] Creating new hop varieties...")
  for (const hop of NEW_HOPS) {
    const existing = await hopService.listHops({ slug: hop.slug })
    if (existing.length > 0) {
      logger.info(`  Skip (exists): ${hop.name}`)
      continue
    }
    await hopService.createHops({
      name: hop.name,
      slug: hop.slug,
      origin: hop.origin,
      flavor_profile: hop.flavor_profile,
      is_active: true,
    })
    logger.info(`  Created: ${hop.name}`)
  }

  const allHops = await hopService.listHops({})
  const hopByName: Record<string, any> = {}
  for (const hop of allHops) {
    hopByName[hop.name.toLowerCase()] = hop
  }
  logger.info(`[Hop Enrichment] ${allHops.length} total hops in taxonomy`)

  const allProducts = await productModule.listProducts({}, { take: 200 })
  const productByHandle: Record<string, any> = {}
  for (const product of allProducts) {
    productByHandle[(product as any).handle] = product
  }
  logger.info(`[Hop Enrichment] ${allProducts.length} products in database`)

  let updated = 0
  let skipped = 0
  let noHops = 0

  for (const entry of mapping) {
    const product = productByHandle[entry.handle]
    if (!product) {
      logger.warn(`[Hop Enrichment] Product not found: ${entry.handle}`)
      skipped++
      continue
    }

    if (!entry.hops || entry.hops.length === 0) {
      noHops++
      continue
    }

    const hopIds: string[] = []
    const hopNames: string[] = []

    for (const hopName of entry.hops) {
      const normalized = HOP_NORMALIZATION[hopName] || hopName
      const hop = hopByName[normalized.toLowerCase()]
      if (hop) {
        hopIds.push(hop.id)
        hopNames.push(hop.name)
      } else {
        logger.warn(`  Unknown hop "${hopName}" (normalized: "${normalized}") for ${entry.beer}`)
      }
    }

    if (hopIds.length === 0) continue

    for (const hopId of hopIds) {
      try {
        await link.create({
          [HOP_MODULE]: { hop_id: hopId },
          [Modules.PRODUCT]: { product_id: product.id },
        })
      } catch (err: any) {
        if (
          !err.message?.includes("already exists") &&
          !err.message?.includes("duplicate")
        ) {
          logger.warn(`  Link failed: ${hopId} → ${product.id}: ${err.message}`)
        }
      }
    }

    const existingMeta = (product.metadata as any) || {}
    await productModule.updateProducts(product.id, {
      metadata: {
        ...existingMeta,
        hops: hopNames,
        hop_source: entry.source || "web-research",
        hop_description: entry.description || null,
      },
    })

    updated++
    logger.info(`  Updated: ${entry.beer} (${entry.brewery}) → [${hopNames.join(", ")}]`)
  }

  logger.info(
    `[Hop Enrichment] Complete: ${updated} products updated, ${noHops} had no hops, ${skipped} not found in DB`
  )
}
