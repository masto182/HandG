import NotificationModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const NOTIFICATION_MODULE = "notification"

export default Module(NOTIFICATION_MODULE, {
  service: NotificationModuleService,
})
