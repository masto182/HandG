import { MedusaService } from "@medusajs/framework/utils"
import StorefrontEvent from "./models/storefront-event"

class AnalyticsModuleService extends MedusaService({ StorefrontEvent }) {}

export default AnalyticsModuleService
