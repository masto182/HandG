import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { PICKUP_LOCATION_MODULE } from "../../../../modules/pickup-location"
import type PickupLocationModuleService from "../../../../modules/pickup-location/service"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(PICKUP_LOCATION_MODULE) as PickupLocationModuleService
  const stockLocationModule = req.scope.resolve(Modules.STOCK_LOCATION)
  const { id } = req.params
  try {
    const location = await (svc as any).retrievePickupLocation(id)
    let stock_location: any = null
    if (location.stock_location_id) {
      try {
        stock_location = await stockLocationModule.retrieveStockLocation(
          location.stock_location_id,
          { relations: ["address"] }
        )
      } catch {}
    }
    res.json({ location: { ...location, stock_location } })
  } catch {
    res.status(404).json({ message: "Pickup location not found" })
  }
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(PICKUP_LOCATION_MODULE) as PickupLocationModuleService
  const { id } = req.params
  const body = req.body as Record<string, unknown>

  const allowedFields = ["slug", "hours", "phone", "notes", "is_active", "sort_order"]
  const filtered: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in body) filtered[key] = body[key]
  }

  await (svc as any).updatePickupLocations({ selector: { id }, data: filtered })
  const location = await (svc as any).retrievePickupLocation(id)
  res.json({ location })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc = req.scope.resolve(PICKUP_LOCATION_MODULE) as PickupLocationModuleService
  const { id } = req.params
  await (svc as any).deletePickupLocations([id])
  res.json({ id, deleted: true })
}
