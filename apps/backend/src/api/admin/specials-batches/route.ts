import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SPECIALS_BATCH_MODULE } from "../../../modules/specials-batch"
import {
  sendSpecialsBatch,
  ClaimConflictError,
  NoEligibleCampaignsError,
} from "../../../workflows/send-specials-batch"
import type { BroadcastSegmentFilter } from "../../../lib/resolve-broadcast-segment"

const SegmentFilterSchema = z
  .object({
    mode: z.enum(["filters", "customers"]).optional(),
    customer_ids: z.array(z.string()).optional(),
    vip_tier_min: z.string().optional(),
    category_optin: z.string().optional(),
    brewery_id: z.string().optional(),
    hop_id: z.string().optional(),
    has_ordered: z.boolean().optional(),
    account_status: z.string().optional(),
  })
  .default({})

const SendSchema = z.object({
  campaign_ids: z.array(z.string().min(1)).min(1),
  segment_filter: SegmentFilterSchema,
  label: z.string().trim().max(200).nullable().optional(),
})

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const batchService = req.scope.resolve(SPECIALS_BATCH_MODULE) as any
  const [batches, count] = await batchService.listAndCountSpecialsBatches(
    {},
    { order: { created_at: "DESC" } }
  )
  res.json({ batches, count })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = SendSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" })
  }

  const actor = (req as any).auth_context?.actor_id ?? null
  const campaignIds = [...new Set(parsed.data.campaign_ids)]

  try {
    const { batch } = await sendSpecialsBatch(req.scope, {
      campaign_ids: campaignIds,
      segment_filter: parsed.data.segment_filter as BroadcastSegmentFilter,
      label: parsed.data.label ?? null,
      created_by: actor,
    })
    res.status(201).json({ batch })
  } catch (err) {
    if (err instanceof ClaimConflictError) {
      return res.status(409).json({
        message: "Some campaigns were already claimed by another batch - refresh and try again",
        unclaimed_campaign_ids: err.unclaimedCampaignIds,
      })
    }
    if (err instanceof NoEligibleCampaignsError) {
      return res.status(409).json({
        message: "No eligible products with AUD pricing found on the selected campaigns",
      })
    }
    throw err
  }
}
