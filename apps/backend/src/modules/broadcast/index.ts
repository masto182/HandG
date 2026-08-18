import BroadcastModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const BROADCAST_MODULE = "broadcast"

export default Module(BROADCAST_MODULE, {
  service: BroadcastModuleService,
})
