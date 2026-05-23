import { MedusaService } from "@medusajs/framework/utils"
import BeerStyle from "./models/beer-style"

class BeerStyleModuleService extends MedusaService({
  BeerStyle,
}) {}

export default BeerStyleModuleService
