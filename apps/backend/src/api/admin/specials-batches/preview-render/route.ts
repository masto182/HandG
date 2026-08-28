import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { renderSpecialsPreview } from "../../../../workflows/send-specials-batch"

const Schema = z.object({
  message: z.string().trim().max(2000).nullable().optional(),
})

/** Renders (never sends or persists) the exact email a "send to everyone" click would produce right now. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" })
  }

  const result = await renderSpecialsPreview(req.scope, parsed.data.message ?? null)
  res.json(result)
}
