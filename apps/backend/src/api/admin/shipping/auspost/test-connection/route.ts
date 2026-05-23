import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getAusPostClient } from "../../../../../modules/auspost/factory"
import type { PacRateRequest } from "../../../../../modules/auspost/types"

/**
 * POST /admin/shipping/auspost/test-connection
 *
 * Hits PAC /service.json with a Sydney -> Melbourne 1.5kg parcel as a
 * smoke test for the configured AUSPOST_API_KEY (or stub).
 *
 * Body (optional): { fromPostcode, toPostcode, weightKg, lengthCm, widthCm, heightCm }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as Partial<PacRateRequest>

  const sample: PacRateRequest = {
    fromPostcode: body.fromPostcode ?? "3037",
    toPostcode: body.toPostcode ?? "3000",
    lengthCm: body.lengthCm ?? 22,
    widthCm: body.widthCm ?? 16,
    heightCm: body.heightCm ?? 7,
    weightKg: body.weightKg ?? 1.5,
  }

  try {
    const client = getAusPostClient()
    const services = await client.listServices(sample)
    const stub = !process.env.AUSPOST_API_KEY
    res.json({
      ok: true,
      mode: stub ? "stub" : "live",
      sample,
      service_count: services.length,
      services: services.map((s) => ({
        code: s.code,
        name: s.name,
        price: s.price,
        max_extra_cover: s.max_extra_cover,
      })),
    })
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: (err as Error).message,
      sample,
    })
  }
}
