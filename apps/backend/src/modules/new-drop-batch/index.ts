import NewDropBatchModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const NEW_DROP_BATCH_MODULE = "newDropBatch"

export default Module(NEW_DROP_BATCH_MODULE, {
  service: NewDropBatchModuleService,
})
