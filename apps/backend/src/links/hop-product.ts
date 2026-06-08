import { defineLink } from "@medusajs/framework/utils"
import HopModule from "../modules/hop"
import ProductModule from "@medusajs/medusa/product"

// Many-to-many: a product has many hops; a hop appears on many products.
export default defineLink(
  { linkable: HopModule.linkable.hop, isList: true },
  { linkable: ProductModule.linkable.product, isList: true }
)
