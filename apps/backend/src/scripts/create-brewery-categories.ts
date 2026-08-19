/**
 * Backfill product categories for each PRIMARY brewery, from existing
 * brewery-product links (see src/links/brewery-product.ts).
 *
 * Collab-brewery links are ignored — only a product's primary brewery
 * (product.metadata.brewery_slug match) gets the category assigned.
 *
 * Idempotent: safe to re-run. Categories are found-or-created by handle
 * (the brewery slug); products already carrying the correct category are
 * simply re-assigned (no-op in practice).
 *
 * Usage:
 *   npx medusa exec ./src/scripts/create-brewery-categories.ts            # dry run (default)
 *   DRY_RUN=false npx medusa exec ./src/scripts/create-brewery-categories.ts  # commit
 */
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import {
  resolvePrimaryBrewery,
  findOrCreateBreweryCategory,
  assignProductsToBreweryCategory,
  type LinkedBrewery,
} from "./lib/brewery-category"

export default async function createBreweryCategories({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT) as any
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const dryRun = process.env.DRY_RUN !== "false"
  logger.info(`[BreweryCategories] Starting (${dryRun ? "DRY RUN" : "COMMIT"})...`)

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
    `[BreweryCategories] Scanned ${products.length} products — ${byBrewerySlug.size} primary breweries, ${skippedNoPrimary} products skipped (no primary brewery match)`
  )

  for (const { brewery, productIds } of byBrewerySlug.values()) {
    if (dryRun) {
      logger.info(
        `[BreweryCategories] [dry run] Would ensure category "${brewery.name}" (handle=${brewery.slug}) and assign ${productIds.length} product(s)`
      )
      continue
    }

    const category = await findOrCreateBreweryCategory(productModule, brewery)
    await assignProductsToBreweryCategory(productModule, productIds, category.id)
    logger.info(
      `[BreweryCategories] ${brewery.name} -> category ${category.id}, ${productIds.length} product(s) assigned`
    )
  }

  if (dryRun) {
    logger.info(`[BreweryCategories] Dry run complete — use DRY_RUN=false to commit`)
  }
}
