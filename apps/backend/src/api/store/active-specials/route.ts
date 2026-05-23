import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CAMPAIGN_MODULE } from "../../../modules/campaign"
import type CampaignModuleService from "../../../modules/campaign/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(CAMPAIGN_MODULE) as CampaignModuleService
  const campaigns = await svc.listActive()

  const specials = campaigns.map((c: any) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    type: c.type,
    starts_at: c.starts_at,
    ends_at: c.ends_at,
    target_product_ids: c.target_product_ids || [],
    target_customer_groups: c.target_customer_groups || [],
    discount_type: c.discount_type,
    discount_value: c.discount_value,
  }))

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")
  res.json({ specials })
}
