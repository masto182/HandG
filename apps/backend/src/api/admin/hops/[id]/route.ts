import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HOP_MODULE } from "../../../../modules/hop"
import { updateHopWorkflow } from "../../../../workflows/manage-hop"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const hopService = req.scope.resolve(HOP_MODULE) as any
  const { id } = req.params
  const hop = await hopService.retrieveHop(id)
  res.json({ hop })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const updates = req.body as any

  const { result: hop } = await updateHopWorkflow(req.scope).run({
    input: { id, ...updates },
  })

  res.json({ hop })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  await updateHopWorkflow(req.scope).run({
    input: { id, is_active: false },
  })

  res.json({ success: true })
}
