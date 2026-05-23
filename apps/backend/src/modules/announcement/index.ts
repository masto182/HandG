import AnnouncementModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const ANNOUNCEMENT_MODULE = "announcement"

export default Module(ANNOUNCEMENT_MODULE, {
  service: AnnouncementModuleService,
})
