import RestockAlertModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const RESTOCK_ALERT_MODULE = "restockAlert"

export default Module(RESTOCK_ALERT_MODULE, {
  service: RestockAlertModuleService,
})
