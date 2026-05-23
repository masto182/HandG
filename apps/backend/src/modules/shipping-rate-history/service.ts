import { MedusaService } from "@medusajs/framework/utils"
import ShippingRateHistory from "./models/shipping-rate-history"

class ShippingRateHistoryModuleService extends MedusaService({
  ShippingRateHistory,
}) {
  async listRecent(limit = 20) {
    return await (this as any).listShippingRateHistories(
      {},
      { order: { sampled_at: "DESC" }, take: limit },
    )
  }
}

export default ShippingRateHistoryModuleService
