import { model } from "@medusajs/framework/utils"

const BroadcastRecipient = model.define("broadcast_recipient", {
  id: model.id().primaryKey(),
  broadcast_id: model.text(),
  customer_id: model.text(),
  inapp_sent: model.boolean().default(false),
  email_sent: model.boolean().default(false),
  email_attempts: model.number().default(0),
  dispatched_at: model.dateTime().nullable(),
  skip_reason: model.text().nullable(),
})

export default BroadcastRecipient
