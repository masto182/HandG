import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  countSegment,
  type BroadcastSegmentFilter,
} from "../../../../lib/resolve-broadcast-segment"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = req.body as { segment_filter?: BroadcastSegmentFilter }
  const count = await countSegment(req.scope, body.segment_filter ?? {})
  res.json({ count })
}
