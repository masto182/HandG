import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BEER_DETAIL_MODULE } from "../../../../../modules/beer-detail"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(BEER_DETAIL_MODULE) as any
  const { id } = req.params

  const records = await service.listBeerDetails({ product_id: id })
  const detail = records[0] || null

  res.json({
    beer_detail: detail
      ? {
          hop_provenance: detail.hop_provenance || null,
          untappd_rating: detail.untappd_rating || null,
        }
      : null,
  })
}
