import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SPECIALS_BATCH_MODULE } from "../../../../modules/specials-batch"
import { retryFailedSpecialsBatch } from "../../../../workflows/send-specials-batch"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const batchService = req.scope.resolve(SPECIALS_BATCH_MODULE) as any
  const { id } = req.params

  const batch = await batchService.retrieveSpecialsBatch(id)
  const items = await batchService.listSpecialsBatchItems({ batch_id: id })
  const recipients = await batchService.listSpecialsBatchRecipients({ batch_id: id })
  const recipientIds = recipients.map((r: any) => r.id)
  const deliveries = recipientIds.length
    ? await batchService.listSpecialsEmailDeliveries({ recipient_id: recipientIds })
    : []

  const deliveryStatusCounts: Record<string, number> = {}
  for (const d of deliveries as any[]) {
    deliveryStatusCounts[d.status] = (deliveryStatusCounts[d.status] ?? 0) + 1
  }

  const inappSentCount = recipients.filter((r: any) => r.inapp_sent).length

  res.json({
    batch,
    items,
    recipient_count: recipients.length,
    inapp_sent_count: inappSentCount,
    delivery_status_counts: deliveryStatusCounts,
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
  const batch = await retryFailedSpecialsBatch(req.scope, id)
  res.json({ batch })
}
