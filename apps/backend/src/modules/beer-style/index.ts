import BeerStyleModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const BEER_STYLE_MODULE = "beerStyle"

export default Module(BEER_STYLE_MODULE, {
  service: BeerStyleModuleService,
})
