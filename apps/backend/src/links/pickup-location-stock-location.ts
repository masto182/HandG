import { defineLink } from "@medusajs/framework/utils"
import PickupLocationModule from "../modules/pickup-location"
import StockLocationModule from "@medusajs/medusa/stock-location"

export default defineLink(
  PickupLocationModule.linkable.pickupLocation,
  StockLocationModule.linkable.stockLocation
)
