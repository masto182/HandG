import { model } from "@medusajs/framework/utils"

const HopAlert = model.define("hop_alert", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  hop_id: model.text(),
  channel_email: model.boolean().default(true),
  channel_inapp: model.boolean().default(true),
})

export default HopAlert
