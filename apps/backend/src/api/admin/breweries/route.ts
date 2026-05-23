import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createBreweryWorkflow } from "../../../workflows/manage-brewery"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const breweryService = req.scope.resolve("brewery") as any
  const breweries = await breweryService.listBreweries({})
  res.json({ breweries })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = req.body as {
    name: string
    slug: string
    description?: string
    location?: string
    logo_url?: string
    hero_image_url?: string
    website_url?: string
    untappd_url?: string
    facebook_url?: string
    instagram_url?: string
  }

  const { result } = await createBreweryWorkflow(req.scope).run({
    input: body,
  })

  res.status(201).json({ brewery: result })
}
