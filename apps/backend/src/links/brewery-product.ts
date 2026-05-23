import { defineLink } from "@medusajs/framework/utils"
import BreweryModule from "../modules/brewery"
import ProductModule from "@medusajs/medusa/product"

export default defineLink(
  { linkable: BreweryModule.linkable.brewery, isList: true },
  ProductModule.linkable.product
)
