import { model } from "@medusajs/framework/utils"

const NotificationPreference = model.define("notification_preference", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  category: model.text(),
  enabled: model.boolean().default(true),
})

export default NotificationPreference
