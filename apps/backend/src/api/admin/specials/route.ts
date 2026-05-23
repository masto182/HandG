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
  const { status, type } = req.query as { status?: string; type?: string }

  const filters: any = {}
  if (status) filters.status = status
  if (type) filters.type = type

  const [campaigns, count] = await (svc as any).listAndCountSpecialCampaigns(
    filters,
    { order: { created_at: "DESC" } }
  )
  res.json({ campaigns, count })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(CAMPAIGN_MODULE) as CampaignModuleService
  const body = req.body as Record<string, unknown>

  if (!body?.title || !body?.slug || !body?.starts_at) {
    return res.status(400).json({ message: "title, slug, starts_at are required" })
  }

  if (!body.status) body.status = body.ends_at ? "scheduled" : "draft"

  const created = await (svc as any).createSpecialCampaigns(body)
  res.status(201).json({ campaign: Array.isArray(created) ? created[0] : created })
}
