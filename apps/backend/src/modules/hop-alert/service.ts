import { MedusaService } from "@medusajs/framework/utils"
import HopAlert from "./models/hop-alert"

class HopAlertModuleService extends MedusaService({
  HopAlert,
}) {}

export default HopAlertModuleService
