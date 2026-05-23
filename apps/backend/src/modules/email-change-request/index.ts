import EmailChangeRequestModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const EMAIL_CHANGE_REQUEST_MODULE = "emailChangeRequest"

export default Module(EMAIL_CHANGE_REQUEST_MODULE, {
  service: EmailChangeRequestModuleService,
})
