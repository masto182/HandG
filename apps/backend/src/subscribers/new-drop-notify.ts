import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { NEW_DROP_BATCH_MODULE } from "../modules/new-drop-batch"

/**
 * Replaces the old immediate per-product send: this subscriber only
 * captures products into the new_drop_queue table for manual admin review
 * and batch send (see admin/new-drops). It never sends an email or inbox
 * notification itself.
 *
 * Idempotency / cutover rules:
 * - product.created: insert a pending queue row if one doesn't already
 *   exist (unique on product_id at the DB level guards races between
 *   overlapping created/updated events).
 * - product.updated: NEVER create a new queue row - only refresh brewery
 *   metadata on an existing *pending* row. This prevents already-batched,
 *   already-sent, or historical (pre-cutover) products from silently
 *   re-entering the queue just because an admin edited them later.
 */
export default async function newDropNotify({ event, container }: SubscriberArgs<{ id: string }>) {
  const productId = event.data.id
  const eventName = event.name
  const logger = container.resolve("logger") as any
  const productModule = container.resolve(Modules.PRODUCT)
  const queueService = container.resolve(NEW_DROP_BATCH_MODULE) as any

  const [product] = await productModule.listProducts(
    { id: productId },
    { select: ["id", "status", "metadata"] }
  )
  if (!product) return

  const existing = await queueService.listNewDropQueues({
    product_id: productId,
  })
  const row = Array.isArray(existing) ? existing[0] : existing

  const metaBreweryName =
    (product as any).metadata?.brewery_name || (product as any).metadata?.brewery || null
  const metaBrewerySlug = (product as any).metadata?.brewery_slug || null

  if (!row) {
    if (eventName !== "product.created") return

    let breweryId: string | null = null
    let breweryName: string | null = metaBreweryName
    try {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "product",
        fields: ["breweries.id", "breweries.name"],
        filters: { id: productId },
      })
      const breweries = ((data?.[0] as any)?.breweries || []).filter((b: any) => b?.id)
      if (breweries[0]) {
        breweryId = breweries[0].id
        breweryName = breweries[0].name || breweryName
      }
    } catch (err) {
      logger.warn(`[NewDrop] linked lookup failed for ${productId}: ${err}`)
    }

    try {
      await queueService.createNewDropQueues({
        product_id: productId,
        brewery_id: breweryId,
        brewery_name: breweryName,
        brewery_slug: metaBrewerySlug,
        status: "pending",
        queued_at: new Date(),
        batch_id: null,
      })
    } catch (err: any) {
      const msg = String(err?.message || err)
      if (!msg.toLowerCase().includes("duplicate")) {
        logger.error(`[NewDrop] Failed to enqueue ${productId}: ${err}`)
      }
    }
    return
  }

  // Only refresh a still-pending row; never touch batched/sent/skipped rows.
  if (row.status !== "pending") return

  const nextBreweryName = metaBreweryName || row.brewery_name
  const nextBrewerySlug = metaBrewerySlug || row.brewery_slug
  if (nextBreweryName !== row.brewery_name || nextBrewerySlug !== row.brewery_slug) {
    await queueService.updateNewDropQueues({
      id: row.id,
      brewery_name: nextBreweryName,
      brewery_slug: nextBrewerySlug,
    })
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
}
