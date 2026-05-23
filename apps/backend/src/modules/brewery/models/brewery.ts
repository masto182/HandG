import { model } from "@medusajs/framework/utils"

const Brewery = model.define("brewery", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text().unique(),
  description: model.text().nullable(),
  location: model.text().nullable(),
  logo_url: model.text().nullable(),
  hero_image_url: model.text().nullable(),
  website_url: model.text().nullable(),
  untappd_url: model.text().nullable(),
  facebook_url: model.text().nullable(),
  instagram_url: model.text().nullable(),
  is_active: model.boolean().default(true),
})

export default Brewery
