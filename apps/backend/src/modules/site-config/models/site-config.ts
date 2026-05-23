import { model } from "@medusajs/framework/utils"

const SiteConfig = model.define("site_config", {
  id: model.id().primaryKey(),
  key: model.text().unique(),
  value: model.json(),
  updated_by: model.text().nullable(),
})

export default SiteConfig
