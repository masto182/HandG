import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { activateCampaignWorkflow } from "../../../../../workflows/manage-campaign"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const { result } = await activateCampaignWorkflow(req.scope).run({ input: { id } })
  res.json({ campaign: result })
}
