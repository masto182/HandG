import { model } from "@medusajs/framework/utils"

const Hop = model.define("hop", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text().unique(),
  origin: model.text().nullable(),
  country_code: model.text().nullable(),
  breeder: model.text().nullable(),
  available_forms: model.json().nullable(),
  farm_notes: model.text().nullable(),
  flavor_profile: model.text().nullable(),
  description: model.text().nullable(),
  image_url: model.text().nullable(),
  is_active: model.boolean().default(true),
})

export default Hop
