import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { updateBeerStyleWorkflow, deleteBeerStyleWorkflow } from "../../../../workflows/manage-beer-style"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const beerStyleService = req.scope.resolve("beerStyle") as any
  const { id } = req.params

  const style = await beerStyleService.retrieveBeerStyle(id)

  res.json({ beer_style: style })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result } = await updateBeerStyleWorkflow(req.scope).run({
    input: { id, ...(req.body as Record<string, unknown>) },
  })

  res.json({ beer_style: result })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  await deleteBeerStyleWorkflow(req.scope).run({
    input: { id },
  })

  res.status(200).json({ id, deleted: true })
}
