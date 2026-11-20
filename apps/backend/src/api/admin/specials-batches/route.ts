import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SPECIALS_BATCH_MODULE } from "../../../modules/specials-batch"
import {
  sendSpecialsBatch,
  SelectedSpecialsUnavailableError,
  NoActiveSpecialsError,
  SendInProgressError,
} from "../../../workflows/send-specials-batch"

const SendSchema = z.object({
  product_ids: z.array(z.string().min(1)).min(1).max(500),
  label: z.string().trim().max(200).nullable().optional(),
  message: z.string().trim().max(2000).nullable().optional(),
  subject: z
    .string()
    .trim()
    .max(200)
    .regex(/^[^\r\n]*$/, "Subject must be a single line")
    .nullable()
    .optional(),
  excluded_customer_ids: z.array(z.string().min(1)).max(5000).optional(),
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
  const parsed = SendSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" })
  }

  const actor = (req as any).auth_context?.actor_id ?? null
  const productIds = [...new Set(parsed.data.product_ids)]

  try {
    const { batch } = await sendSpecialsBatch(req.scope, {
      product_ids: productIds,
      label: parsed.data.label ?? null,
      message: parsed.data.message ?? null,
      subject: parsed.data.subject ?? null,
      created_by: actor,
      excluded_customer_ids: parsed.data.excluded_customer_ids ?? [],
    })
    res.status(201).json({ batch })
  } catch (err) {
    if (err instanceof SendInProgressError) {
      return res.status(409).json({ message: err.message })
    }
    if (err instanceof NoActiveSpecialsError) {
      return res.status(409).json({ message: err.message })
    }
    if (err instanceof SelectedSpecialsUnavailableError) {
      return res.status(409).json({
        message: err.message,
        unavailable_product_ids: err.productIds,
      })
    }
    throw err
  }
}
