import BeerDetailModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const BEER_DETAIL_MODULE = "beerDetail"

export default Module(BEER_DETAIL_MODULE, {
  service: BeerDetailModuleService,
})
