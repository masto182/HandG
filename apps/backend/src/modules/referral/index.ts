import ReferralModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const REFERRAL_MODULE = "referral"

export default Module(REFERRAL_MODULE, {
  service: ReferralModuleService,
})
