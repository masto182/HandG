import { defineLink } from "@medusajs/framework/utils"
import HopModule from "../modules/hop"
import ProductModule from "@medusajs/medusa/product"

export default defineLink(
  { linkable: HopModule.linkable.hop, isList: true },
  ProductModule.linkable.product
)
