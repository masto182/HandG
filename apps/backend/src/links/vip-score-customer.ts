import { defineLink } from "@medusajs/framework/utils"
import VipScoreModule from "../modules/vip-score"
import CustomerModule from "@medusajs/medusa/customer"

export default defineLink(
  VipScoreModule.linkable.vipScore,
  CustomerModule.linkable.customer
)
