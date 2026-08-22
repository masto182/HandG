import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { NEW_DROP_BATCH_MODULE } from "../../../modules/new-drop-batch"
import { assessNewDropReadinessBatch } from "../../../lib/assess-new-drop-readiness"

/**
 * GET /admin/new-drop-queue
 *
 * Pending new-drop queue, joined to product title/thumbnail and readiness
 * blockers/warnings, for the New Drops admin page. Products only ever
 * appear here as 'pending' - once claimed into a batch they disappear
 * (status flips to 'batched'/'sent').
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const queueService = req.scope.resolve(NEW_DROP_BATCH_MODULE) as any
  const productModule = req.scope.resolve(Modules.PRODUCT)

  const queueRows = await queueService.listNewDropQueues(
    { status: "pending" },
    { order: { queued_at: "ASC" } }
  )

  if (!queueRows.length) {
    return res.json({ items: [] })
  }

  const productIds = queueRows.map((q: any) => q.product_id)
  const products = await productModule.listProducts(
    { id: productIds },
    { select: ["id", "title", "handle", "status", "thumbnail"] }
  )
  const productMap = new Map(products.map((p: any) => [p.id, p]))
  const readinessMap = await assessNewDropReadinessBatch(req.scope, productIds)

  const items = queueRows.map((q: any) => {
    const product = productMap.get(q.product_id)
    const readiness = readinessMap.get(q.product_id)
    return {
      queue_id: q.id,
      product_id: q.product_id,
      title: (product as any)?.title ?? "(deleted product)",
      handle: (product as any)?.handle ?? null,
      thumbnail: (product as any)?.thumbnail ?? null,
      brewery_id: q.brewery_id,
      brewery_name: q.brewery_name,
      brewery_slug: q.brewery_slug,
      queued_at: q.queued_at,
      blockers: readiness?.blockers ?? ["product_not_found"],
      warnings: readiness?.warnings ?? [],
    }
  })

  res.json({ items })
}
