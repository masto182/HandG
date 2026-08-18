import { model } from "@medusajs/framework/utils"

const Broadcast = model.define("broadcast", {
  id: model.id().primaryKey(),
  title: model.text(),
  body: model.text(),
  link_text: model.text().nullable(),
  link_url: model.text().nullable(),
  segment_filter: model.json().nullable(),
  status: model.enum(["draft", "sending", "sent", "failed"]).default("draft"),
  recipient_count: model.number().default(0),
  sent_count: model.number().default(0),
  failed_count: model.number().default(0),
  created_by: model.text().nullable(),
  sent_at: model.dateTime().nullable(),
})

export default Broadcast
