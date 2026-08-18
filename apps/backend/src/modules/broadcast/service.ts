import { MedusaService } from "@medusajs/framework/utils"
import Broadcast from "./models/broadcast"
import BroadcastRecipient from "./models/broadcast-recipient"

class BroadcastModuleService extends MedusaService({
  Broadcast,
  BroadcastRecipient,
}) {}

export default BroadcastModuleService
