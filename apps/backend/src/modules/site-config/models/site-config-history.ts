import { model } from "@medusajs/framework/utils"

const SiteConfigHistory = model.define("site_config_history", {
  id: model.id().primaryKey(),
  key: model.text(),
  value_old: model.json().nullable(),
  value_new: model.json().nullable(),
  action: model.enum(["set", "unset"]),
  actor: model.text().nullable(),
})

export default SiteConfigHistory
