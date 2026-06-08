import HopAlertModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const HOP_ALERT_MODULE = "hopAlert"

export default Module(HOP_ALERT_MODULE, {
  service: HopAlertModuleService,
})
