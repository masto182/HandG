import { MedusaService } from "@medusajs/framework/utils"
import NewDropQueue from "./models/new-drop-queue"
import NewDropBatch from "./models/new-drop-batch"
import NewDropBatchItem from "./models/new-drop-batch-item"
import NewDropBatchRecipient from "./models/new-drop-batch-recipient"
import NewDropBatchRecipientItem from "./models/new-drop-batch-recipient-item"
import NewDropEmailDelivery from "./models/new-drop-email-delivery"

class NewDropBatchModuleService extends MedusaService({
  NewDropQueue,
  NewDropBatch,
  NewDropBatchItem,
  NewDropBatchRecipient,
  NewDropBatchRecipientItem,
  NewDropEmailDelivery,
}) {}

export default NewDropBatchModuleService
