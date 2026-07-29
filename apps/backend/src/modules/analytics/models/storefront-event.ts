import { model } from "@medusajs/framework/utils"

const StorefrontEvent = model.define("storefront_event", {
  id: model.id().primaryKey(),
  event_type: model.text(),
  session_id: model.text(),
  customer_id: model.text().nullable(),
  payload: model.json(),
})

export default StorefrontEvent
