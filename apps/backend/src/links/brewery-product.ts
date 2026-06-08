import { defineLink } from "@medusajs/framework/utils"
import BreweryModule from "../modules/brewery"
import ProductModule from "@medusajs/medusa/product"

// Many-to-many: a product may be linked to multiple breweries (primary +
// collaborators). The primary brewery is identified by metadata.brewery_slug;
// any other linked breweries are collab partners.
export default defineLink(
  { linkable: BreweryModule.linkable.brewery, isList: true },
  { linkable: ProductModule.linkable.product, isList: true }
)
