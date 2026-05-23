import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateBreweryWorkflow, deleteBreweryWorkflow } from "../../../../workflows/manage-brewery"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const breweryService = req.scope.resolve("brewery") as any

  const brewery = await breweryService.retrieveBrewery(id)
  if (!brewery) {
    return res.status(404).json({ message: "Brewery not found" })
  }
  res.json({ brewery })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const body = req.body as Record<string, unknown>

  const { result } = await updateBreweryWorkflow(req.scope).run({
    input: { id, ...body },
  })

  res.json({ brewery: result })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  await deleteBreweryWorkflow(req.scope).run({
    input: { id },
  })

  res.json({ success: true })
}
