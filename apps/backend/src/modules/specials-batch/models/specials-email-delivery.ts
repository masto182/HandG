import { model } from "@medusajs/framework/utils"

const SpecialsEmailDelivery = model.define("specials_email_delivery", {
  id: model.id().primaryKey(),
  recipient_id: model.text().unique(),
  status: model.enum(["pending", "retry", "sent", "skipped", "failed"]).default("pending"),
  attempts: model.number().default(0),
  next_attempt_at: model.dateTime().nullable(),
  sent_at: model.dateTime().nullable(),
  skip_reason: model.text().nullable(),
  last_error: model.text().nullable(),
})

export default SpecialsEmailDelivery
