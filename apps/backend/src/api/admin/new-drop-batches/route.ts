import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { NEW_DROP_BATCH_MODULE } from "../../../modules/new-drop-batch"
import {
  sendNewDropBatch,
  ReadinessBlockedError,
  ClaimConflictError,
} from "../../../workflows/manage-new-drop-batch"

const SendSchema = z.object({
  product_ids: z.array(z.string().min(1)).min(1),
  label: z.string().trim().max(200).nullable().optional(),
  excluded_customer_ids: z.array(z.string().min(1)).optional(),
})

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const batchService = req.scope.resolve(NEW_DROP_BATCH_MODULE) as any
  const [batches, count] = await batchService.listAndCountNewDropBatches(
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
  const productIds = [...new Set(parsed.data.product_ids)]

  try {
    const { batch } = await sendNewDropBatch(req.scope, {
      product_ids: productIds,
      label: parsed.data.label ?? null,
      created_by: actor,
      excluded_customer_ids: parsed.data.excluded_customer_ids ?? [],
    })
    res.status(201).json({ batch })
  } catch (err) {
    if (err instanceof ReadinessBlockedError) {
      return res.status(409).json({
        message: "Some products are not ready to send",
        blockers: err.blockers,
      })
    }
    if (err instanceof ClaimConflictError) {
      return res.status(409).json({
        message: "Some products were already claimed by another batch - refresh and try again",
        unclaimed_product_ids: err.unclaimedProductIds,
      })
    }
    throw err
  }
}
