import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import AusPostProviderService from "./service"

export const AUSPOST_MODULE = "auspost"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [AusPostProviderService],
})

export { AusPostProviderService }
export { AusPostPacClient } from "./client"
export { StubAusPostPacClient } from "./stub"
export { getAusPostClient, resetAusPostClientCache } from "./factory"
export {
  applyDiscount,
  allocateCover,
  boxesToPacRequests,
  computeOptions,
  parseSurcharges,
  quoteService,
  serviceDisplayName,
  PAC_COVER_CAP_BASE_AUD,
  PAC_COVER_CAP_SOD_AUD,
  type RateOptions,
  type ShipmentQuote,
  type PerBoxQuote,
} from "./mapping"
export * from "./types"
