import { MedusaService } from "@medusajs/framework/utils"
import Brewery from "./models/brewery"

class BreweryModuleService extends MedusaService({
  Brewery,
}) {}

export default BreweryModuleService
