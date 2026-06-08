import BreweryFollowModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const BREWERY_FOLLOW_MODULE = "breweryFollow"

export default Module(BREWERY_FOLLOW_MODULE, {
  service: BreweryFollowModuleService,
})
