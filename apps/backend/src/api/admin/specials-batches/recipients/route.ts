import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listSpecialsRecipients } from "../../../../workflows/send-specials-batch"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const recipients = await listSpecialsRecipients(req.scope)
  res.json({ recipients })
}
