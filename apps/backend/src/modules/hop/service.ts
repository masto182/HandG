import { MedusaService } from "@medusajs/framework/utils"
import Hop from "./models/hop"

class HopModuleService extends MedusaService({
  Hop,
}) {}

export default HopModuleService
