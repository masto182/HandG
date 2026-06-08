import AlertDispatchModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const ALERT_DISPATCH_MODULE = "alertDispatch"

export default Module(ALERT_DISPATCH_MODULE, {
  service: AlertDispatchModuleService,
})
