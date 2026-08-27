import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  listEligibleSpecialsItems,
  previewSpecialsBatch,
} from "../../../../workflows/send-specials-batch"

/** Everything currently on special, plus how many customers a send would reach right now. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const [items, preview] = await Promise.all([
    listEligibleSpecialsItems(req.scope),
    previewSpecialsBatch(req.scope),
  ])
  res.json({ items, recipientCount: preview.recipientCount })
}
