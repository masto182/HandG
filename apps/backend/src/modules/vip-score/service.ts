import { MedusaService } from "@medusajs/framework/utils"
import VipScore from "./models/vip-score"

class VipScoreModuleService extends MedusaService({
  VipScore,
}) {}

export default VipScoreModuleService
