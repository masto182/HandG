/**
 * One-off merge: consolidate the E2E test-fixture "Tree House Brewing"
 * (slug tree-house-brewing, created by seed-e2e-products.ts) into the real
 * "Tree House" (slug tree-house) brewery.
 *
 * Local/CI test-env only — production never has tree-house-brewing
 * (deploy-prod.yml intentionally excludes seed-e2e-products), so this
 * script safely no-ops if tree-house-brewing doesn't exist.
 *
 * For each product currently linked to tree-house-brewing:
 *   - repoint metadata.brewery_slug / brewery_id / brewery_name to Tree House
 *   - dismiss the old brewery link, create the new one
 * Then cleans up any brewery_follow rows on tree-house-brewing and deletes
 * the brewery row.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/merge-tree-house-brewery.ts            # dry run (default)
 *   DRY_RUN=false npx medusa exec ./src/scripts/merge-tree-house-brewery.ts  # commit
 */
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const OLD_SLUG = "tree-house-brewing"
const NEW_SLUG = "tree-house"

export default async function mergeTreeHouseBrewery({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT) as any
  const breweryService = container.resolve("brewery") as any
  const breweryFollowService = container.resolve("breweryFollow") as any
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const dryRun = process.env.DRY_RUN !== "false"
  logger.info(`[MergeTreeHouse] Starting (${dryRun ? "DRY RUN" : "COMMIT"})...`)

  const [oldBrewery] = await breweryService.listBreweries({ slug: OLD_SLUG })
  if (!oldBrewery) {
    logger.info(`[MergeTreeHouse] No "${OLD_SLUG}" brewery found — nothing to merge.`)
    return
  }

  const [newBrewery] = await breweryService.listBreweries({ slug: NEW_SLUG })
  if (!newBrewery) {
    logger.error(
      `[MergeTreeHouse] Target brewery "${NEW_SLUG}" not found — aborting (nothing to merge into).`
    )
    return
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "metadata", "breweries.id", "breweries.slug"],
    filters: {},
    pagination: { take: null } as any,
  })
  const affected = (products as any[]).filter((p) =>
    (p.breweries || []).some((b: any) => b.slug === OLD_SLUG)
  )

  logger.info(`[MergeTreeHouse] Found ${affected.length} product(s) linked to "${OLD_SLUG}"`)

  const follows = await breweryFollowService.listBreweryFollows({ brewery_id: oldBrewery.id })
  logger.info(`[MergeTreeHouse] Found ${follows.length} brewery_follow row(s) on "${OLD_SLUG}"`)

  if (dryRun) {
    for (const p of affected) {
      logger.info(`[MergeTreeHouse] [dry run] Would repoint product ${p.id} — ${p.title}`)
    }
    if (follows.length) {
      logger.info(`[MergeTreeHouse] [dry run] Would delete ${follows.length} brewery_follow row(s)`)
    }
    logger.info(`[MergeTreeHouse] [dry run] Would delete brewery "${OLD_SLUG}" (${oldBrewery.id})`)
    logger.info(`[MergeTreeHouse] Dry run complete — use DRY_RUN=false to commit`)
    return
  }

  for (const p of affected) {
    await productModule.updateProducts(p.id, {
      metadata: {
        ...p.metadata,
        brewery_slug: NEW_SLUG,
        brewery_id: newBrewery.id,
        brewery_name: newBrewery.name,
      },
    })
    try {
      await link.dismiss({
        brewery: { brewery_id: oldBrewery.id },
        [Modules.PRODUCT]: { product_id: p.id },
      })
    } catch (e: any) {
      logger.warn(`[MergeTreeHouse] Link dismiss failed for ${p.id}: ${e?.message || e}`)
    }
    try {
      await link.create({
        brewery: { brewery_id: newBrewery.id },
        [Modules.PRODUCT]: { product_id: p.id },
      })
    } catch {
      // already linked — ignore
    }
    logger.info(`[MergeTreeHouse] Repointed ${p.id} — ${p.title}`)
  }

  if (follows.length) {
    await breweryFollowService.deleteBreweryFollows(follows.map((f: any) => f.id))
    logger.info(`[MergeTreeHouse] Deleted ${follows.length} brewery_follow row(s) on "${OLD_SLUG}"`)
  }

  await breweryService.deleteBreweries(oldBrewery.id)
  logger.info(`[MergeTreeHouse] Deleted brewery "${OLD_SLUG}" (${oldBrewery.id})`)
  logger.info(
    `[MergeTreeHouse] Merge complete — ${affected.length} product(s) now under "${NEW_SLUG}"`
  )
}
