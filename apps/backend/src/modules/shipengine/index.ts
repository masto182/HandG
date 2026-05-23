import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import ShipEngineProviderService from "./service"

export const SHIPENGINE_MODULE = "shipengine"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [ShipEngineProviderService],
})

export { ShipEngineProviderService }
export { ShipEngineClient } from "./client"
export { StubShipEngineClient } from "./stub"
export { getShipEngineClient, resetShipEngineClientCache } from "./factory"
export { computeShipmentWeightG } from "./weight"
export { rateToShippingOption, cartToShipEngineShipment, CurrencyMismatchError } from "./mapping"
export * from "./types"
