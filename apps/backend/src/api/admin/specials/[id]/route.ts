import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { CAMPAIGN_MODULE } from "../../../../modules/campaign"
import type CampaignModuleService from "../../../../modules/campaign/service"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(CAMPAIGN_MODULE) as CampaignModuleService
  const { id } = req.params
  try {
    const campaign = await (svc as any).retrieveSpecialCampaign(id)
    res.json({ campaign })
  } catch {
    res.status(404).json({ message: "Campaign not found" })
  }
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(CAMPAIGN_MODULE) as CampaignModuleService
  const { id } = req.params
  const body = req.body as Record<string, unknown>

  const campaign = await (svc as any).retrieveSpecialCampaign(id)
  if (!["draft", "scheduled"].includes(campaign.status)) {
    return res.status(400).json({ message: "Can only update draft or scheduled campaigns" })
  }

  await (svc as any).updateSpecialCampaigns({ selector: { id }, data: body })
  const updated = await (svc as any).retrieveSpecialCampaign(id)
  res.json({ campaign: updated })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(CAMPAIGN_MODULE) as CampaignModuleService
  const { id } = req.params

  const campaign = await (svc as any).retrieveSpecialCampaign(id)
  if (campaign.price_list_id) {
    try {
      const { Modules } = await import("@medusajs/framework/utils")
      const pricingModule = req.scope.resolve(Modules.PRICING) as any
      await pricingModule.deletePriceLists([campaign.price_list_id])
    } catch {}
  }

  await (svc as any).deleteSpecialCampaigns([id])
  res.json({ id, deleted: true })
}
