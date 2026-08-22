import { model } from "@medusajs/framework/utils"

const NewDropBatchRecipientItem = model.define("new_drop_batch_recipient_item", {
  id: model.id().primaryKey(),
  recipient_id: model.text(),
  product_id: model.text(),
  kind: model.enum(["hop", "brewery", "all_new"]),
  category: model.enum(["hop_alerts", "brewery_releases", "new_drops"]),
  channel_email: model.boolean().default(false),
  channel_inapp: model.boolean().default(false),
  alert_dispatch_id: model.text().nullable(),
  /** Names of followed breweries this item matched, independent of `kind`/`category`. */
  matched_brewery_names: model.json().nullable(),
  /** Names of followed hops this item matched, independent of `kind`/`category`. */
  matched_hop_names: model.json().nullable(),
})

export default NewDropBatchRecipientItem
