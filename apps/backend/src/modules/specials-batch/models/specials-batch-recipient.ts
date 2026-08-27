import { model } from "@medusajs/framework/utils"

const SpecialsBatchRecipient = model.define("specials_batch_recipient", {
  id: model.id().primaryKey(),
  batch_id: model.text(),
  customer_id: model.text(),
  inapp_sent: model.boolean().default(false),
  dispatched_at: model.dateTime().nullable(),
})

export default SpecialsBatchRecipient
