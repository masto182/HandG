import { model } from "@medusajs/framework/utils"

const EmailLog = model.define("email_log", {
  id: model.id().primaryKey(),
  resend_id: model.text().nullable(),
  to_address: model.text(),
  category: model.text(),
  template_name: model.text(),
  subject: model.text().nullable(),
  customer_id: model.text().nullable(),
  status: model.text().default("sent"),
  sent_at: model.dateTime().nullable(),
  last_event_at: model.dateTime().nullable(),
  delivered_at: model.dateTime().nullable(),
  opened_at: model.dateTime().nullable(),
  clicked_at: model.dateTime().nullable(),
  bounced_at: model.dateTime().nullable(),
  complained_at: model.dateTime().nullable(),
  open_count: model.number().default(0),
  click_count: model.number().default(0),
  error_reason: model.text().nullable(),
  raw_events: model.json().nullable(),
})

export default EmailLog
