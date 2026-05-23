import NotificationPreferenceModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const NOTIFICATION_PREFERENCE_MODULE = "notificationPreference"

export default Module(NOTIFICATION_PREFERENCE_MODULE, {
  service: NotificationPreferenceModuleService,
})
