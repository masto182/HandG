import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SHIPPING_RATE_HISTORY_MODULE } from "../../../../modules/shipping-rate-history"
import type ShippingRateHistoryModuleService from "../../../../modules/shipping-rate-history/service"

/**
 * GET /admin/shipping/rate-comparison
 *
 * Returns the most recent rate-history rows persisted by the weekly
 * sample-shipping-rates cron. Used by the admin shipping page snapshot card.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  let svc: ShippingRateHistoryModuleService | null = null
  try {
    svc = req.scope.resolve(SHIPPING_RATE_HISTORY_MODULE) as ShippingRateHistoryModuleService
  } catch {
    res.json({ rows: [] })
    return
  }

  const limit = Math.min(parseInt((req.query.limit as string) ?? "20", 10) || 20, 100)
  const rows = (await svc.listRecent(limit)) ?? []
  res.json({
    rows: rows.map((r: any) => ({
      id: r.id,
      sampled_at: r.sampled_at,
      label: r.sample_label,
      weight_g: r.weight_g,
      destination_postcode: r.destination_postcode,
      destination_state: r.destination_state,
      cheapest_carrier_code: r.cheapest_carrier_code,
      cheapest_amount_cents: r.cheapest_amount_cents,
      baseline_carrier_code: r.baseline_carrier_code,
      baseline_amount_cents: r.baseline_amount_cents,
      carrier_results: r.carrier_results,
    })),
  })
}
