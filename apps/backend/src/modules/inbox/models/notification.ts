import { model } from "@medusajs/framework/utils"

const Notification = model.define("notification", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  type: model.text(),
  title: model.text(),
  body: model.text(),
  read: model.boolean().default(false),
  metadata: model.json().nullable(),
})

export default Notification
