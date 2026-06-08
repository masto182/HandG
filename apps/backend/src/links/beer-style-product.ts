import { defineLink } from "@medusajs/framework/utils"
import BeerStyleModule from "../modules/beer-style"
import ProductModule from "@medusajs/medusa/product"

// One style applies to many products. Each product is exactly one style.
export default defineLink(BeerStyleModule.linkable.beerStyle, {
  linkable: ProductModule.linkable.product,
  isList: true,
})
