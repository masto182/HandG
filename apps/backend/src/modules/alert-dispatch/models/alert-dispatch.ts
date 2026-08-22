import { model } from "@medusajs/framework/utils"

const AlertDispatch = model.define("alert_dispatch", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  product_id: model.text(),
  kind: model.text(),
  channel_email: model.boolean().default(false),
  channel_inapp: model.boolean().default(false),
  email_sent: model.boolean().default(false),
  dispatched_at: model.dateTime().nullable(),
  email_delivery_id: model.text().nullable(),
  clicked_at: model.dateTime().nullable(),
  viewed_at: model.dateTime().nullable(),
  carted_at: model.dateTime().nullable(),
  ordered_at: model.dateTime().nullable(),
  order_id: model.text().nullable(),
})

export default AlertDispatch
