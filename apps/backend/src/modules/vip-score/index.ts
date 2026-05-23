import VipScoreModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const VIP_SCORE_MODULE = "vipScore"

export default Module(VIP_SCORE_MODULE, {
  service: VipScoreModuleService,
})
