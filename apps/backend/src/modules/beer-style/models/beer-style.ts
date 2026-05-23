import { model } from "@medusajs/framework/utils"

const BeerStyle = model.define("beer_style", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text(),
  family: model.text(),
  description: model.text().nullable(),
  color_hex: model.text().nullable(),
  sort_order: model.number().default(0),
})

export default BeerStyle
