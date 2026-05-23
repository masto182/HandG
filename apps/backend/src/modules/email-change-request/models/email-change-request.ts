import { model } from "@medusajs/framework/utils"

const EmailChangeRequest = model.define("email_change_request", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  new_email: model.text(),
  token: model.text().unique(),
  expires_at: model.dateTime(),
  used_at: model.dateTime().nullable(),
})

export default EmailChangeRequest
