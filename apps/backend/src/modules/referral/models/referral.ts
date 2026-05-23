import { model } from "@medusajs/framework/utils"

const Referral = model.define("referral", {
  id: model.id().primaryKey(),
  referrer_customer_id: model.text(),
  referred_customer_id: model.text(),
  referral_code: model.text(),
  stealth_mode: model.boolean().default(false),
})

export default Referral
