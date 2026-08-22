import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { Modules } from "@medusajs/framework/utils"
import { NEW_DROP_BATCH_MODULE } from "../../../../modules/new-drop-batch"
import { retryFailedNewDropBatch } from "../../../../workflows/manage-new-drop-batch"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const batchService = req.scope.resolve(NEW_DROP_BATCH_MODULE) as any
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const { id } = req.params

  const batch = await batchService.retrieveNewDropBatch(id)
  const items = await batchService.listNewDropBatchItems({ batch_id: id })
  const productIds = items.map((i: any) => i.product_id)
  const products = productIds.length
    ? await productModule.listProducts(
        { id: productIds },
        { select: ["id", "title", "handle", "thumbnail"] }
      )
    : []

  const recipients = await batchService.listNewDropBatchRecipients({ batch_id: id })
  const recipientIds = recipients.map((r: any) => r.id)
  const deliveries = recipientIds.length
    ? await batchService.listNewDropEmailDeliveries({ recipient_id: recipientIds })
    : []

  const deliveryStatusByCategory: Record<string, Record<string, number>> = {}
  for (const d of deliveries as any[]) {
    deliveryStatusByCategory[d.category] ??= {}
    deliveryStatusByCategory[d.category][d.status] =
      (deliveryStatusByCategory[d.category][d.status] ?? 0) + 1
  }

  const inappSentCount = recipients.filter((r: any) => r.inapp_sent).length

  res.json({
    batch,
    products,
    recipient_count: recipients.length,
    inapp_sent_count: inappSentCount,
    delivery_status_by_category: deliveryStatusByCategory,
  })
}

const RetrySchema = z.object({
  action: z.literal("retry-failed"),
})

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = RetrySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" })
  }

  const { id } = req.params
  const batch = await retryFailedNewDropBatch(req.scope, id)
  res.json({ batch })
}
