import { defineLink } from "@medusajs/framework/utils"
import ReferralModule from "../modules/referral"
import CustomerModule from "@medusajs/medusa/customer"

export default defineLink(
  ReferralModule.linkable.referral,
  CustomerModule.linkable.customer
)
