import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import {
  renderSpecialsPreview,
  SelectedSpecialsUnavailableError,
  NoActiveSpecialsError,
} from "../../../../workflows/send-specials-batch"

const Schema = z.object({
  product_ids: z.array(z.string().min(1)).min(1).max(500),
  message: z.string().trim().max(2000).nullable().optional(),
  subject: z
    .string()
    .trim()
    .max(200)
    .regex(/^[^\r\n]*$/, "Subject must be a single line")
    .nullable()
    .optional(),
})

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" })
  }

  try {
    const result = await renderSpecialsPreview(req.scope, {
      productIds: [...new Set(parsed.data.product_ids)],
      message: parsed.data.message ?? null,
      subject: parsed.data.subject ?? null,
    })
    res.json(result)
  } catch (err) {
    if (err instanceof SelectedSpecialsUnavailableError) {
      return res.status(409).json({
        message: err.message,
        unavailable_product_ids: err.productIds,
      })
    }
    if (err instanceof NoActiveSpecialsError) {
      return res.status(409).json({ message: err.message })
    }
    throw err
  }
}
