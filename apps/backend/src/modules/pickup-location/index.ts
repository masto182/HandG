import PickupLocationModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PICKUP_LOCATION_MODULE = "pickupLocation"

export default Module(PICKUP_LOCATION_MODULE, {
  service: PickupLocationModuleService,
})
