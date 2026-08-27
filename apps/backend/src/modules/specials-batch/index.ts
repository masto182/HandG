import SpecialsBatchModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const SPECIALS_BATCH_MODULE = "specialsBatch"

export default Module(SPECIALS_BATCH_MODULE, {
  service: SpecialsBatchModuleService,
})
