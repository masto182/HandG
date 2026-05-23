import { model } from "@medusajs/framework/utils"

const RestockAlert = model.define("restock_alert", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  beer_name: model.text(),
  brewery_name: model.text(),
  product_id: model.text().nullable(),
  notified_at: model.dateTime().nullable(),
  tier_at_notification: model.text().nullable(),
})

export default RestockAlert
