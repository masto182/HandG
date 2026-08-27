import { MedusaService } from "@medusajs/framework/utils"
import SpecialsBatch from "./models/specials-batch"
import SpecialsBatchItem from "./models/specials-batch-item"
import SpecialsBatchRecipient from "./models/specials-batch-recipient"
import SpecialsEmailDelivery from "./models/specials-email-delivery"

class SpecialsBatchModuleService extends MedusaService({
  SpecialsBatch,
  SpecialsBatchItem,
  SpecialsBatchRecipient,
  SpecialsEmailDelivery,
}) {}

export default SpecialsBatchModuleService
