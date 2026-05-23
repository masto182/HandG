import SiteConfigModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const SITE_CONFIG_MODULE = "siteConfig"

export default Module(SITE_CONFIG_MODULE, {
  service: SiteConfigModuleService,
})
