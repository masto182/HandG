import BreweryModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const BREWERY_MODULE = "brewery"

export default Module(BREWERY_MODULE, {
  service: BreweryModuleService,
})
