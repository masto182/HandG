import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { renderNewDropPreview } from "../../../../workflows/manage-new-drop-batch"

const Schema = z.object({
  product_ids: z.array(z.string().min(1)).min(1),
  customer_id: z.string().min(1).nullable().optional(),
})

/**
 * Renders (never sends or persists) the exact email a given customer would
 * receive for this product selection - or the generic email when
 * `customer_id` is omitted/null. Read-only, callable as many times as the
 * operator wants while reviewing a batch before sending.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" })
  }

  const productIds = [...new Set(parsed.data.product_ids)]
  const result = await renderNewDropPreview(req.scope, productIds, parsed.data.customer_id ?? null)
  res.json(result)
}
