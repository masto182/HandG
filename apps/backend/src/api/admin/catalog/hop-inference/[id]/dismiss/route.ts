import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { dismissHopInferenceWorkflow } from "../../../../../../workflows/manage-hop-inference"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  await dismissHopInferenceWorkflow(req.scope).run({
    input: { beer_detail_id: id },
  })

  res.json({ success: true })
}
