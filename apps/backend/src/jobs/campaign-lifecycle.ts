import { MedusaContainer } from "@medusajs/framework/types"
import { CAMPAIGN_MODULE } from "../modules/campaign"
import { activateCampaignWorkflow, expireCampaignWorkflow } from "../workflows/manage-campaign"

export default async function campaignLifecycle(container: MedusaContainer) {
  const campaignService = container.resolve(CAMPAIGN_MODULE) as any
  const logger = container.resolve("logger") as any

  logger.info("[Campaign Lifecycle] Running...")

  const now = new Date()

  const scheduled = await campaignService.listSpecialCampaigns({ status: "scheduled" })
  for (const campaign of scheduled) {
    if (new Date(campaign.starts_at) <= now) {
      try {
        await activateCampaignWorkflow(container).run({ input: { id: campaign.id } })
        logger.info(`[Campaign Lifecycle] Activated: ${campaign.title}`)
      } catch (e: any) {
        logger.error(`[Campaign Lifecycle] Failed to activate ${campaign.id}: ${e.message}`)
      }
    }
  }

  const active = await campaignService.listSpecialCampaigns({ status: "active" })
  for (const campaign of active) {
    if (campaign.ends_at && new Date(campaign.ends_at) <= now) {
      try {
        await expireCampaignWorkflow(container).run({ input: { id: campaign.id } })
        logger.info(`[Campaign Lifecycle] Expired: ${campaign.title}`)
      } catch (e: any) {
        logger.error(`[Campaign Lifecycle] Failed to expire ${campaign.id}: ${e.message}`)
      }
    }
  }

  logger.info("[Campaign Lifecycle] Done.")
}

export const config = {
  name: "campaign-lifecycle",
  schedule: "*/5 * * * *",
}
