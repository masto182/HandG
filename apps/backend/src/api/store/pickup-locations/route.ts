import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { PICKUP_LOCATION_MODULE } from "../../../modules/pickup-location"
import type PickupLocationModuleService from "../../../modules/pickup-location/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PICKUP_LOCATION_MODULE) as PickupLocationModuleService
  const stockLocationModule = req.scope.resolve(Modules.STOCK_LOCATION)
  const locations = await svc.listActive()

  const enriched: any[] = []
  for (const loc of locations) {
    let stock_location: any = null
    if (loc.stock_location_id) {
      try {
        stock_location = await (stockLocationModule as any).retrieveStockLocation(
          loc.stock_location_id,
          { relations: ["address"] }
        )
      } catch {}
    }
    enriched.push({ ...loc, stock_location })
  }

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")
  res.json({ locations: enriched })
}
