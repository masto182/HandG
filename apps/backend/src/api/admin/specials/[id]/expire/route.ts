import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { expireCampaignWorkflow } from "../../../../../workflows/manage-campaign"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const { result } = await expireCampaignWorkflow(req.scope).run({ input: { id } })
  res.json({ campaign: result })
}
