import { model } from "@medusajs/framework/utils"

const StorefrontSession = model.define("storefront_session", {
  id: model.id().primaryKey(),
  customer_id: model.text().nullable(),
  started_at: model.dateTime(),
  last_seen_at: model.dateTime(),
  ended_at: model.dateTime().nullable(),
  page_count: model.number().default(0),
  active_seconds: model.number().default(0),
  entry_path: model.text().nullable(),
  last_path: model.text().nullable(),
  referrer: model.text().nullable(),
})

export default StorefrontSession
