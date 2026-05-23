import { defineLink } from "@medusajs/framework/utils"
import BeerDetailModule from "../modules/beer-detail"
import ProductModule from "@medusajs/medusa/product"

export default defineLink(
  BeerDetailModule.linkable.beerDetail,
  ProductModule.linkable.product
)
