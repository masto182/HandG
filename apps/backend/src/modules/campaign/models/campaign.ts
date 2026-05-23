import { model } from "@medusajs/framework/utils"

const SpecialCampaign = model.define("special_campaign", {
  id: model.id().primaryKey(),
  title: model.text(),
  slug: model.text().unique(),
  type: model.enum(["flash_sale", "vip_exclusive", "aging_markdown"]).default("flash_sale"),
  description: model.text().nullable(),
  starts_at: model.dateTime(),
  ends_at: model.dateTime().nullable(),
  target_customer_groups: model.json().nullable(),
  target_product_ids: model.json().nullable(),
  discount_type: model.enum(["percentage", "fixed"]).default("percentage"),
  discount_value: model.number().default(0),
  price_list_id: model.text().nullable(),
  status: model.enum(["draft", "scheduled", "active", "expired"]).default("draft"),
  metadata: model.json().nullable(),
})

export default SpecialCampaign
