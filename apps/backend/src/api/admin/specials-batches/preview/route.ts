import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { previewSpecialsBatch } from "../../../../workflows/send-specials-batch"
import type { BroadcastSegmentFilter } from "../../../../lib/resolve-broadcast-segment"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = req.body as { campaign_ids?: string[]; segment_filter?: BroadcastSegmentFilter }
  const campaignIds = [...new Set(body.campaign_ids ?? [])]
  const preview = await previewSpecialsBatch(req.scope, campaignIds, body.segment_filter ?? {})
  res.json(preview)
}
