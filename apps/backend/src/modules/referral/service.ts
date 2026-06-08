import { MedusaService } from "@medusajs/framework/utils"
import Referral from "./models/referral"
import ReferralCode from "./models/referral-code"

class ReferralModuleService extends MedusaService({
  Referral,
  ReferralCode,
}) {}

export default ReferralModuleService
