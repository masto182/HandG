import { model } from "@medusajs/framework/utils"

const ShippingRateHistory = model.define("shipping_rate_history", {
  id: model.id().primaryKey(),
  sampled_at: model.dateTime(),
  sample_label: model.text(),
  weight_g: model.number(),
  destination_postcode: model.text(),
  destination_state: model.text(),
  destination_country: model.text().default("AU"),
  carrier_results: model.json(),
  cheapest_carrier_code: model.text().nullable(),
  cheapest_amount_cents: model.number().nullable(),
  baseline_carrier_code: model.text().nullable(),
  baseline_amount_cents: model.number().nullable(),
})

export default ShippingRateHistory
