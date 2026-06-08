import NotificationModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const INBOX_MODULE = "inbox"

export default Module(INBOX_MODULE, {
  service: NotificationModuleService,
})
