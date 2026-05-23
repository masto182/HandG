import { model } from "@medusajs/framework/utils"

const Wishlist = model.define("wishlist", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  product_id: model.text(),
  mode: model.text().default("buy_later"),
  target_price: model.float().nullable(),
  stock_threshold: model.number().default(2),
  price_alert_sent: model.boolean().default(false),
  admin_approved_offer: model.boolean().default(false),
  admin_offer_price: model.float().nullable(),
  admin_offer_expires_at: model.dateTime().nullable(),
  campaign_id: model.text().nullable(),
  promotion_id: model.text().nullable(),
  promotion_code: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default Wishlist
