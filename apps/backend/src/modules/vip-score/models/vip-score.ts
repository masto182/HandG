import { model } from "@medusajs/framework/utils"

const VipScore = model.define("vip_score", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  personal_spend_12mo: model.float().default(0),
  // Legacy aggregate (direct + indirect raw spend); kept until Sprint 11 cleanup.
  network_spend_12mo: model.float().default(0),
  // Sprint 3: split out so the dashboard can show direct vs indirect separately.
  direct_spend_12mo: model.float().default(0),
  indirect_spend_12mo: model.float().default(0),
  vip_score: model.float().default(0),
  order_count_12mo: model.number().default(0),
  current_tier: model.text().default("approved"),
  tier_achieved_at: model.dateTime().nullable(),
  pending_demotion: model.boolean().default(false),
  demotion_warning_at: model.dateTime().nullable(),
  last_evaluated_at: model.dateTime().nullable(),
})

export default VipScore
