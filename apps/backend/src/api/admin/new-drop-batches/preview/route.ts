import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { previewNewDropBatch } from "../../../../workflows/manage-new-drop-batch"

const Schema = z.object({
  product_ids: z.array(z.string().min(1)).min(1),
})

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" })
  }

  const productIds = [...new Set(parsed.data.product_ids)]
  const preview = await previewNewDropBatch(req.scope, productIds)
  res.json(preview)
}
