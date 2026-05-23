import ShippingRateHistoryModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const SHIPPING_RATE_HISTORY_MODULE = "shippingRateHistory"

export default Module(SHIPPING_RATE_HISTORY_MODULE, {
  service: ShippingRateHistoryModuleService,
})

export { default as ShippingRateHistoryModuleService } from "./service"
