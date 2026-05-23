import { MedusaService } from "@medusajs/framework/utils"
import BeerDetail from "./models/beer-detail"

class BeerDetailModuleService extends MedusaService({
  BeerDetail,
}) {}

export default BeerDetailModuleService
