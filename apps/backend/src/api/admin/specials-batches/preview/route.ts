import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  listEligibleSpecialsItems,
  listSpecialsRecipients,
} from "../../../../workflows/send-specials-batch"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const items = await listEligibleSpecialsItems(req.scope)
  const recipients = await listSpecialsRecipients(req.scope)
  res.json({
    items,
    itemCount: items.length,
    recipientCount: recipients.filter((recipient) => !recipient.opted_out).length,
  })
}
