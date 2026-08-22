import { model } from "@medusajs/framework/utils"

const NewDropBatchItem = model.define("new_drop_batch_item", {
  id: model.id().primaryKey(),
  batch_id: model.text(),
  product_id: model.text(),
})

export default NewDropBatchItem
