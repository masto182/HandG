import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { CAMPAIGN_MODULE } from "../../../modules/campaign"
import type CampaignModuleService from "../../../modules/campaign/service"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(CAMPAIGN_MODULE) as CampaignModuleService
  const { status } = req.query as { status?: string }

  const filters: any = { status: status || "pending" }
  const [candidates, count] = await (svc as any).listAndCountAgingCandidates(
    filters,
    { order: { days_aged: "DESC" } }
  )
  res.json({ candidates, count })
}
