import { model } from "@medusajs/framework/utils"

/**
 * One row per (batch, campaign, product) - snapshotted at claim time so the
 * email always renders the price/discount that was true when the batch was
 * built, even if the source campaign is later edited or expires mid-flight.
 */
const SpecialsBatchItem = model.define("specials_batch_item", {
  id: model.id().primaryKey(),
  batch_id: model.text(),
  campaign_id: model.text(),
  product_id: model.text(),
  product_title: model.text(),
  product_handle: model.text(),
  product_thumbnail: model.text().nullable(),
  original_price: model.number(),
  discounted_price: model.number(),
  discount_type: model.enum(["percentage", "fixed"]),
  discount_value: model.number(),
})

export default SpecialsBatchItem
