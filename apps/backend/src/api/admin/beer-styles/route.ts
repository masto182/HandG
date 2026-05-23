import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { createBeerStyleWorkflow } from "../../../workflows/manage-beer-style"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const beerStyleService = req.scope.resolve("beerStyle") as any

  const [styles, count] = await beerStyleService.listAndCountBeerStyles(
    {},
    { order: { family: "ASC", sort_order: "ASC" } }
  )

  res.json({ beer_styles: styles, count })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { result } = await createBeerStyleWorkflow(req.scope).run({
    input: req.body as any,
  })

  res.status(201).json({ beer_style: result })
}
