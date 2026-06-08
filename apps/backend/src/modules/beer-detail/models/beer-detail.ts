import { model } from "@medusajs/framework/utils"

const BeerDetail = model.define("beer_detail", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  untappd_rating: model.float().nullable(),
  untappd_bid: model.text().nullable(),
  hg_stats: model.json().nullable(),
  hop_provenance: model.text().nullable(),
  enrichment_status: model.text().nullable(),
  batch_group_id: model.text().nullable(),
})

export default BeerDetail
