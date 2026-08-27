import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SPECIALS_BATCH_MODULE } from "../../../modules/specials-batch"
import {
  sendSpecialsBatch,
  ClaimConflictError,
  NoEligibleCampaignsError,
} from "../../../workflows/send-specials-batch"

const SendSchema = z.object({
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

/** Sends a specials email to every customer - always all currently-active specials, no selection needed. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = SendSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" })
  }

  const actor = (req as any).auth_context?.actor_id ?? null

  try {
    const { batch } = await sendSpecialsBatch(req.scope, {
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
        message: "Nothing is currently on special",
      })
    }
    throw err
  }
}
