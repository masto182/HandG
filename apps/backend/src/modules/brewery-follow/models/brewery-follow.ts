import { model } from "@medusajs/framework/utils"

const BreweryFollow = model.define("brewery_follow", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  brewery_id: model.text(),
  channel_email: model.boolean().default(true),
  channel_inapp: model.boolean().default(true),
})

export default BreweryFollow
