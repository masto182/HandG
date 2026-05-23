import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { PICKUP_LOCATION_MODULE } from "../../../modules/pickup-location"
import type PickupLocationModuleService from "../../../modules/pickup-location/service"

async function enrichWithStockLocation(locations: any[], stockLocationModule: any) {
  const enriched: any[] = []
  for (const loc of locations) {
    let stock_location: any = null
    if (loc.stock_location_id) {
      try {
        stock_location = await stockLocationModule.retrieveStockLocation(
          loc.stock_location_id,
          { relations: ["address"] }
        )
      } catch {}
    }
    enriched.push({ ...loc, stock_location })
  }
  return enriched
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(PICKUP_LOCATION_MODULE) as PickupLocationModuleService
  const stockLocationModule = req.scope.resolve(Modules.STOCK_LOCATION)
  const [locations, count] = await (svc as any).listAndCountPickupLocations(
    {},
    { order: { sort_order: "ASC" } }
  )
  const enriched = await enrichWithStockLocation(locations, stockLocationModule)
  res.json({ locations: enriched, count })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(PICKUP_LOCATION_MODULE) as PickupLocationModuleService
  const body = req.body as Record<string, unknown>

  if (!body?.stock_location_id || !body?.slug) {
    return res
      .status(400)
      .json({ message: "stock_location_id and slug are required" })
  }

  const created = await (svc as any).createPickupLocations(body)
  res.status(201).json({ location: Array.isArray(created) ? created[0] : created })
}
