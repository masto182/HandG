/**
 * Backfill Product Types for each PRIMARY brewery, from existing
 * brewery-product links — the promotion-targetable equivalent of
 * create-brewery-categories.ts (Product Category is NOT usable as a
 * promotion rule attribute; Product Type is — see lib/brewery-category.ts).
 *
 * Collab-brewery links are ignored — only a product's primary brewery
 * (product.metadata.brewery_slug match) gets the type assigned.
 *
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/assign-brewery-product-types.ts            # dry run (default)
 *   DRY_RUN=false npx medusa exec ./src/scripts/assign-brewery-product-types.ts  # commit
 */
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import {
  resolvePrimaryBrewery,
  findOrCreateBreweryProductType,
  assignProductsToBreweryProductType,
  type LinkedBrewery,
} from "./lib/brewery-category"

export default async function assignBreweryProductTypes({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT) as any
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const dryRun = process.env.DRY_RUN !== "false"
  logger.info(`[BreweryProductTypes] Starting (${dryRun ? "DRY RUN" : "COMMIT"})...`)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "metadata", "breweries.id", "breweries.slug", "breweries.name"],
    pagination: { take: null } as any,
  })

  const byBrewerySlug = new Map<string, { brewery: LinkedBrewery; productIds: string[] }>()
  let skippedNoPrimary = 0

  for (const product of products as any[]) {
    const linked: LinkedBrewery[] = product.breweries || []
    const primary = resolvePrimaryBrewery(product, linked)
    if (!primary) {
      skippedNoPrimary++
      continue
    }
    const entry = byBrewerySlug.get(primary.slug) || { brewery: primary, productIds: [] }
    entry.productIds.push(product.id)
    byBrewerySlug.set(primary.slug, entry)
  }

  logger.info(
    `[BreweryProductTypes] Scanned ${products.length} products — ${byBrewerySlug.size} primary breweries, ${skippedNoPrimary} products skipped (no primary brewery match)`
  )

  for (const { brewery, productIds } of byBrewerySlug.values()) {
    if (dryRun) {
      logger.info(
        `[BreweryProductTypes] [dry run] Would ensure type "${brewery.name} (brewery)" and assign ${productIds.length} product(s)`
      )
      continue
    }

    const type = await findOrCreateBreweryProductType(productModule, brewery)
    await assignProductsToBreweryProductType(productModule, productIds, type.id)
    logger.info(
      `[BreweryProductTypes] ${brewery.name} -> type ${type.id}, ${productIds.length} product(s) assigned`
    )
  }

  if (dryRun) {
    logger.info(`[BreweryProductTypes] Dry run complete — use DRY_RUN=false to commit`)
  }
}
