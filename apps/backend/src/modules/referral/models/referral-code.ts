import { model } from "@medusajs/framework/utils"

/**
 * Indexed lookup of a customer's referral code. Replaces the previous O(N)
 * scan over every customer's metadata.referral_code when resolving a code to a
 * customer (validate) or checking generation collisions. customer.metadata
 * still mirrors the code for display; this table is the authoritative index.
 */
const ReferralCode = model.define("referral_code", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  code: model.text(),
})

export default ReferralCode
