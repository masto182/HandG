/**
 * One-off merge: consolidate 3 pairs of duplicate near-identical breweries
 * created by two separate seed/import runs (2026-06-17 "*-brewing" slugs,
 * minority product counts, vs 2026-07-18 bare-name slugs, majority product
 * counts) into their bare-name counterpart. Same pattern as
 * merge-tree-house-brewery.ts, generalized to N pairs and extended to also
 * migrate brewery_follow (rather than discard) and new_drop_queue rows.
 *
 * Local dev DB only - no staging/prod impact (this script is not wired into
 * any deploy pipeline).
 *
 * Usage:
 *   npx medusa exec ./src/scripts/merge-duplicate-breweries.ts               # dry run (default)
 *   DRY_RUN=false npx medusa exec ./src/scripts/merge-duplicate-breweries.ts # commit
 */
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const PAIRS: Array<{ oldSlug: string; newSlug: string }> = [
  { oldSlug: "brujos-brewing", newSlug: "brujos" },
  { oldSlug: "fidens-brewing", newSlug: "fidens" },
  { oldSlug: "other-half-brewing", newSlug: "other-half" },
]

export default async function mergeDuplicateBreweries({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT) as any
  const breweryService = container.resolve("brewery") as any
  const breweryFollowService = container.resolve("breweryFollow") as any
  const newDropBatchService = container.resolve("newDropBatch") as any
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const dryRun = process.env.DRY_RUN !== "false"
  logger.info(`[MergeBreweries] Starting (${dryRun ? "DRY RUN" : "COMMIT"})...`)

  for (const { oldSlug, newSlug } of PAIRS) {
    logger.info(`\n[MergeBreweries] === ${oldSlug} -> ${newSlug} ===`)

    const [oldBrewery] = await breweryService.listBreweries({ slug: oldSlug })
    if (!oldBrewery) {
      logger.info(`[MergeBreweries] No "${oldSlug}" brewery found - skipping.`)
      continue
    }
    const [newBrewery] = await breweryService.listBreweries({ slug: newSlug })
    if (!newBrewery) {
      logger.error(`[MergeBreweries] Target "${newSlug}" not found - skipping this pair.`)
      continue
    }

    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "metadata", "breweries.id", "breweries.slug"],
      filters: {},
      pagination: { take: null } as any,
    })
    const affected = (products as any[]).filter((p) =>
      (p.breweries || []).some((b: any) => b.slug === oldSlug)
    )
    logger.info(`[MergeBreweries] ${affected.length} product(s) linked to "${oldSlug}"`)

    const follows = await breweryFollowService.listBreweryFollows({ brewery_id: oldBrewery.id })
    logger.info(`[MergeBreweries] ${follows.length} brewery_follow row(s) on "${oldSlug}"`)

    const queueRows = await newDropBatchService.listNewDropQueues({ brewery_id: oldBrewery.id })
    logger.info(`[MergeBreweries] ${queueRows.length} new_drop_queue row(s) on "${oldSlug}"`)

    if (dryRun) {
      for (const p of affected) {
        logger.info(`[MergeBreweries] [dry run] Would repoint product ${p.id} - ${p.title}`)
      }
      if (follows.length) {
        logger.info(
          `[MergeBreweries] [dry run] Would migrate ${follows.length} brewery_follow row(s) to ${newBrewery.id}`
        )
      }
      if (queueRows.length) {
        logger.info(
          `[MergeBreweries] [dry run] Would repoint ${queueRows.length} new_drop_queue row(s) to ${newBrewery.id}`
        )
      }
      logger.info(`[MergeBreweries] [dry run] Would delete brewery "${oldSlug}" (${oldBrewery.id})`)
      continue
    }

    for (const p of affected) {
      await productModule.updateProducts(p.id, {
        metadata: {
          ...p.metadata,
          brewery_slug: newSlug,
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
        logger.warn(`[MergeBreweries] Link dismiss failed for ${p.id}: ${e?.message || e}`)
      }
      try {
        await link.create({
          brewery: { brewery_id: newBrewery.id },
          [Modules.PRODUCT]: { product_id: p.id },
        })
      } catch {
        // already linked - ignore
      }
      logger.info(`[MergeBreweries] Repointed ${p.id} - ${p.title}`)
    }

    // Migrate follows rather than discard them - a customer's intent to
    // follow this brewery should survive the merge. Skip if they already
    // follow the target brewery (would violate no unique constraint here,
    // but avoids a confusing duplicate row).
    for (const f of follows) {
      const [existing] = await breweryFollowService.listBreweryFollows({
        customer_id: f.customer_id,
        brewery_id: newBrewery.id,
      })
      if (existing) {
        await breweryFollowService.deleteBreweryFollows(f.id)
        logger.info(
          `[MergeBreweries] Customer ${f.customer_id} already follows ${newSlug} - dropped duplicate follow on ${oldSlug}`
        )
      } else {
        await breweryFollowService.updateBreweryFollows({ id: f.id, brewery_id: newBrewery.id })
        logger.info(`[MergeBreweries] Migrated follow for customer ${f.customer_id} to ${newSlug}`)
      }
    }

    if (queueRows.length) {
      await newDropBatchService.updateNewDropQueues(
        queueRows.map((q: any) => ({
          id: q.id,
          brewery_id: newBrewery.id,
          brewery_name: newBrewery.name,
          brewery_slug: newSlug,
        }))
      )
      logger.info(
        `[MergeBreweries] Repointed ${queueRows.length} new_drop_queue row(s) to ${newSlug}`
      )
    }

    await breweryService.deleteBreweries(oldBrewery.id)
    logger.info(`[MergeBreweries] Deleted brewery "${oldSlug}" (${oldBrewery.id})`)
    logger.info(`[MergeBreweries] Merge complete for ${oldSlug} -> ${newSlug}`)
  }

  if (dryRun) {
    logger.info(`\n[MergeBreweries] Dry run complete - use DRY_RUN=false to commit`)
  } else {
    logger.info(`\n[MergeBreweries] All merges complete`)
  }
}
