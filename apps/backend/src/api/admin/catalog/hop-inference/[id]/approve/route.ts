import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { approveHopInferenceWorkflow } from "../../../../../../workflows/manage-hop-inference"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const beerDetailService = req.scope.resolve("beerDetail") as any
  const detail = await beerDetailService.retrieveBeerDetail(id)
  if (!detail) {
    return res.status(404).json({ message: "Not found" })
  }

  await approveHopInferenceWorkflow(req.scope).run({
    input: { beer_detail_id: id },
  })

  res.json({ success: true })
}
