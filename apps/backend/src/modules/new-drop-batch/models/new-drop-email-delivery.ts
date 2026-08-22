import { model } from "@medusajs/framework/utils"

const NewDropEmailDelivery = model.define("new_drop_email_delivery", {
  id: model.id().primaryKey(),
  recipient_id: model.text(),
  category: model.enum(["hop_alerts", "brewery_releases", "new_drops"]),
  status: model.enum(["pending", "retry", "sent", "skipped", "failed"]).default("pending"),
  attempts: model.number().default(0),
  next_attempt_at: model.dateTime().nullable(),
  sent_at: model.dateTime().nullable(),
  skip_reason: model.text().nullable(),
  last_error: model.text().nullable(),
})

export default NewDropEmailDelivery
