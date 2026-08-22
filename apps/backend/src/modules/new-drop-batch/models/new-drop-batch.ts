import { model } from "@medusajs/framework/utils"

const NewDropBatch = model.define("new_drop_batch", {
  id: model.id().primaryKey(),
  label: model.text().nullable(),
  status: model.enum(["sending", "sent", "failed"]).default("sending"),
  product_count: model.number().default(0),
  recipient_count: model.number().default(0),
  email_delivery_count: model.number().default(0),
  sent_count: model.number().default(0),
  failed_count: model.number().default(0),
  created_by: model.text().nullable(),
  sent_at: model.dateTime().nullable(),
})

export default NewDropBatch
