import { model } from "@medusajs/framework/utils"

const VipEvent = model.define("vip_event", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  type: model.text(),
  reference_id: model.text(),
  points: model.number(),
  note: model.text().nullable(),
})

export default VipEvent
