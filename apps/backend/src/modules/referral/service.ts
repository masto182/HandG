import { MedusaService } from "@medusajs/framework/utils"
import Referral from "./models/referral"

class ReferralModuleService extends MedusaService({
  Referral,
}) {}

export default ReferralModuleService
