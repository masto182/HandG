import HopModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const HOP_MODULE = "hop"

export default Module(HOP_MODULE, {
  service: HopModuleService,
})
