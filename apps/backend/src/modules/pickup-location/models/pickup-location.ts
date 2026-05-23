import { model } from "@medusajs/framework/utils"

const PickupLocation = model.define("pickup_location", {
  id: model.id().primaryKey(),
  stock_location_id: model.text().unique(),
  slug: model.text().unique(),
  hours: model.json().nullable(),
  phone: model.text().nullable(),
  notes: model.text().nullable(),
  is_active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

export default PickupLocation
