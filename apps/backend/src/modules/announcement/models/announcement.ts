import { model } from "@medusajs/framework/utils"

const Announcement = model.define("announcement", {
  id: model.id().primaryKey(),
  message: model.text(),
  link_text: model.text().nullable(),
  link_url: model.text().nullable(),
  type: model.enum(["info", "warning", "promo"]).default("info"),
  is_active: model.boolean().default(true),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
})

export default Announcement
