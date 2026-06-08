import { model } from "@medusajs/framework/utils"

const RestockAlert = model.define("restock_alert", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  beer_name: model.text(),
  brewery_name: model.text(),
  product_id: model.text().nullable(),
  notified_at: model.dateTime().nullable(),
  // Set when the product is detected back in stock. The cron dispatches the
  // email once now >= restock_detected_at + tier offset (tiered early access).
  restock_detected_at: model.dateTime().nullable(),
  tier_at_notification: model.text().nullable(),
})

export default RestockAlert
