import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
// workflow-exempt: beer-detail reads/writes are simple module calls without side effects
import { BEER_DETAIL_MODULE } from "../../../../../modules/beer-detail"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(BEER_DETAIL_MODULE) as any
  const { id } = req.params
  const records = await service.listBeerDetails({ product_id: id })
  res.json({ beer_detail: records[0] || null })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(BEER_DETAIL_MODULE) as any
  const { id } = req.params
  const { hop_provenance } = req.body as { hop_provenance?: string }

  const existing = await service.listBeerDetails({ product_id: id })
  if (existing.length > 0) {
    const updated = await service.updateBeerDetails({
      id: existing[0].id,
      hop_provenance: hop_provenance ?? null,
    })
    res.json({ beer_detail: updated })
  } else {
    const created = await service.createBeerDetails({
      product_id: id,
      hop_provenance: hop_provenance ?? null,
    })
    res.json({ beer_detail: created })
  }
}
