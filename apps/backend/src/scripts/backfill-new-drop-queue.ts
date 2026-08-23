import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { NEW_DROP_BATCH_MODULE } from "../modules/new-drop-batch"
import { ALERT_DISPATCH_MODULE } from "../modules/alert-dispatch"

/**
 * Backfills new_drop_queue rows for published products that predate the
 * batch-notification cutover (2026-08-20) and were never sent (no
 * alert_dispatch row exists for them from the old immediate-send
 * subscriber) and are not already queued.
 *
 * Dry-run by default - prints what it would insert. Pass --commit to
 * actually insert rows.
 *
 * Usage:
 *   pnpm --filter ./apps/backend exec medusa exec ./src/scripts/backfill-new-drop-queue.ts
 *   pnpm --filter ./apps/backend exec medusa exec ./src/scripts/backfill-new-drop-queue.ts -- --commit
 *   pnpm --filter ./apps/backend exec medusa exec ./src/scripts/backfill-new-drop-queue.ts -- --commit --since=2026-08-01
 *   pnpm --filter ./apps/backend exec medusa exec ./src/scripts/backfill-new-drop-queue.ts -- --commit --brewery=messorem
 *   pnpm --filter ./apps/backend exec medusa exec ./src/scripts/backfill-new-drop-queue.ts -- --commit --product-ids=prod_1,prod_2
 */
export default async function backfillNewDropQueue({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)
  const queueService = container.resolve(NEW_DROP_BATCH_MODULE) as any
  const dispatchService = container.resolve(ALERT_DISPATCH_MODULE) as any

  const argv = process.argv
  const commit = argv.includes("--commit")
  const sinceArg = argv.find((a) => a.startsWith("--since="))?.split("=")[1]
  const breweryArg = argv.find((a) => a.startsWith("--brewery="))?.split("=")[1]
  const productIdsArg = argv.find((a) => a.startsWith("--product-ids="))?.split("=")[1]
  const explicitIds = productIdsArg ? productIdsArg.split(",").map((s) => s.trim()) : null

  const filters: Record<string, unknown> = { status: "published" }
  if (explicitIds) filters.id = explicitIds
  if (sinceArg) filters.created_at = { $gte: new Date(sinceArg) }

  const products = await productModule.listProducts(filters, {
    select: ["id", "title", "status", "metadata", "created_at"],
  })

  const filtered = breweryArg
    ? products.filter((p: any) => {
        const slug = p.metadata?.brewery_slug || ""
        const name = (p.metadata?.brewery_name || p.metadata?.brewery || "").toLowerCase()
        return slug === breweryArg || name === breweryArg.toLowerCase()
      })
    : products

  if (!filtered.length) {
    logger.info("[BackfillNewDropQueue] No matching published products found.")
    return
  }

  const existingQueue = await queueService.listNewDropQueues({
    product_id: filtered.map((p: any) => p.id),
  })
  const alreadyQueued = new Set(existingQueue.map((q: any) => q.product_id))

  const candidateIds = filtered.map((p: any) => p.id).filter((id: string) => !alreadyQueued.has(id))
  if (!candidateIds.length) {
    logger.info("[BackfillNewDropQueue] All matching products are already queued.")
    return
  }

  const existingDispatches = await dispatchService.listAlertDispatches({
    product_id: candidateIds,
  })
  // A product only counts as "already notified" if at least one dispatch
  // for it actually resulted in a sent email - a dispatch row that was
  // created but never sent (the old subscriber created these rows
  // optimistically, before confirming send success) means the customer was
  // never actually notified, so the product is still eligible to backfill.
  const alreadyNotified = new Set(
    existingDispatches.filter((d: any) => d.email_sent).map((d: any) => d.product_id)
  )

  const toInsert = filtered.filter(
    (p: any) => candidateIds.includes(p.id) && !alreadyNotified.has(p.id)
  )
  const skippedAlreadyNotified = filtered.filter(
    (p: any) => candidateIds.includes(p.id) && alreadyNotified.has(p.id)
  )

  logger.info(
    `[BackfillNewDropQueue] ${toInsert.length} product(s) would be queued; ${skippedAlreadyNotified.length} skipped (already have alert_dispatch rows from the old system).`
  )
  for (const p of toInsert) {
    logger.info(`  + ${p.title} (${p.id})`)
  }
  for (const p of skippedAlreadyNotified) {
    logger.info(`  - SKIP (already notified historically): ${p.title} (${p.id})`)
  }

  if (!commit) {
    logger.info("[BackfillNewDropQueue] Dry run - pass --commit to insert.")
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const now = new Date()

  for (const p of toInsert) {
    let breweryId: string | null = null
    let breweryName: string | null =
      (p as any).metadata?.brewery_name || (p as any).metadata?.brewery || null
    try {
      const { data } = await query.graph({
        entity: "product",
        fields: ["breweries.id", "breweries.name"],
        filters: { id: p.id },
      })
      const breweries = ((data?.[0] as any)?.breweries || []).filter((b: any) => b?.id)
      if (breweries[0]) {
        breweryId = breweries[0].id
        breweryName = breweries[0].name || breweryName
      }
    } catch {
      // fall back to metadata-derived name already set above
    }

    await queueService.createNewDropQueues({
      product_id: p.id,
      brewery_id: breweryId,
      brewery_name: breweryName,
      brewery_slug: (p as any).metadata?.brewery_slug || null,
      status: "pending",
      queued_at: now,
      batch_id: null,
    })
  }

  logger.info(`[BackfillNewDropQueue] Inserted ${toInsert.length} queue row(s).`)
}
