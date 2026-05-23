import CampaignModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const CAMPAIGN_MODULE = "specialCampaign"

export default Module(CAMPAIGN_MODULE, {
  service: CampaignModuleService,
})
