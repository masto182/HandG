import { MedusaService } from "@medusajs/framework/utils"
import RestockAlert from "./models/restock-alert"

class RestockAlertModuleService extends MedusaService({
  RestockAlert,
}) {}

export default RestockAlertModuleService
