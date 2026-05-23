import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HOP_MODULE } from "../../../modules/hop"
import { createHopWorkflow } from "../../../workflows/manage-hop"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const hopService = req.scope.resolve(HOP_MODULE) as any
  const hops = await hopService.listHops({})
  res.json({ hops, count: hops.length })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { name, slug, origin, flavor_profile, description, image_url } = req.body as any

  if (!name || !slug) {
    res.status(400).json({ error: "name and slug are required" })
    return
  }

  const { result: hop } = await createHopWorkflow(req.scope).run({
    input: { name, slug, origin, flavor_profile, description, image_url },
  })

  res.status(201).json({ hop })
}
