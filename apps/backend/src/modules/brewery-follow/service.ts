import { MedusaService } from "@medusajs/framework/utils"
import BreweryFollow from "./models/brewery-follow"

class BreweryFollowModuleService extends MedusaService({
  BreweryFollow,
}) {}

export default BreweryFollowModuleService
