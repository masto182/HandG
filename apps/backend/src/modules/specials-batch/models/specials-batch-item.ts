import { model } from "@medusajs/framework/utils"

/**
 * One row per (batch, product) - snapshotted at send time from whatever
 * active Medusa "sale" price list was covering the product, so the email
 * always renders the price/discount that was true at send time even if
 * the price list is edited or expires shortly after.
 */
const SpecialsBatchItem = model.define("specials_batch_item", {
  id: model.id().primaryKey(),
  batch_id: model.text(),
  price_list_id: model.text(),
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
