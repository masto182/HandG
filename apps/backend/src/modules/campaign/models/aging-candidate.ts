import { model } from "@medusajs/framework/utils"

const AgingCandidate = model.define("aging_candidate", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  variant_id: model.text(),
  product_title: model.text().nullable(),
  packaged_date: model.dateTime(),
  days_aged: model.number().default(0),
  status: model.enum(["pending", "approved", "dismissed"]).default("pending"),
  campaign_id: model.text().nullable(),
  dismissed_reason: model.text().nullable(),
})

export default AgingCandidate
