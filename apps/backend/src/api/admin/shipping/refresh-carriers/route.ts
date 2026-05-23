import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getShipEngineClient } from "../../../../modules/shipengine/factory"

/**
 * POST /admin/shipping/refresh-carriers
 *
 * Calls ShipEngine GET /v1/carriers and returns the connected carriers list
 * suitable for an admin dropdown. In stub mode returns 2 placeholder carriers.
 */
export async function POST(_req: MedusaRequest, res: MedusaResponse) {
  const logger = _req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const client = getShipEngineClient()
  try {
    const carriers = await client.listCarriers()
    res.json({
      mode: process.env.SHIPENGINE_API_KEY ? "live" : "stub",
      carriers: carriers.map((c) => ({
        carrier_id: c.carrier_id,
        carrier_code: c.carrier_code,
        friendly_name: c.friendly_name,
        services: (c.services ?? []).map((s) => ({
          service_code: s.service_code,
          name: s.name ?? s.service_code,
        })),
      })),
    })
  } catch (err) {
    logger.error(`[shipengine] refresh-carriers failed: ${(err as Error).message}`)
    res.status(502).json({ message: (err as Error).message, code: "shipengine_error" })
  }
}
