import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { approveAgingWorkflow } from "../../../../../workflows/manage-campaign"
import { activateCampaignWorkflow } from "../../../../../workflows/manage-campaign"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const body = req.body as { discount_type: "percentage" | "fixed"; discount_value: number }

  if (!body?.discount_type || body?.discount_value == null) {
    return res.status(400).json({ message: "discount_type and discount_value are required" })
  }

  const { result } = await approveAgingWorkflow(req.scope).run({
    input: {
      candidate_id: id,
      discount_type: body.discount_type,
      discount_value: body.discount_value,
    },
  })

  await activateCampaignWorkflow(req.scope).run({
    input: { id: result.campaign.id },
  })

  res.json({ candidate: result.candidate, campaign: result.campaign })
}
