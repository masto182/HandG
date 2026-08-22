import { model } from "@medusajs/framework/utils"

const NewDropQueue = model.define("new_drop_queue", {
  id: model.id().primaryKey(),
  product_id: model.text().unique(),
  brewery_id: model.text().nullable(),
  brewery_name: model.text().nullable(),
  brewery_slug: model.text().nullable(),
  status: model.enum(["pending", "batched", "sent", "skipped"]).default("pending"),
  queued_at: model.dateTime(),
  batch_id: model.text().nullable(),
})

export default NewDropQueue
