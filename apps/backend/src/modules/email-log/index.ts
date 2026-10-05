import EmailLogModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const EMAIL_LOG_MODULE = "emailLog"

export default Module(EMAIL_LOG_MODULE, {
  service: EmailLogModuleService,
})
