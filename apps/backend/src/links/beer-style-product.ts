import { defineLink } from "@medusajs/framework/utils"
import BeerStyleModule from "../modules/beer-style"
import ProductModule from "@medusajs/medusa/product"

export default defineLink(
  { linkable: BeerStyleModule.linkable.beerStyle, isList: true },
  ProductModule.linkable.product
)
