import { model } from "@medusajs/framework/utils"

const Referral = model.define("referral", {
  id: model.id().primaryKey(),
  referrer_customer_id: model.text(),
  referred_customer_id: model.text(),
  referral_code: model.text(),
  stealth_mode: model.boolean().default(false),
  // Set when the referrer's reward email has been sent, so a re-delivered
  // order.payment_captured event can't double-reward.
  reward_sent_at: model.dateTime().nullable(),
})

export default Referral
