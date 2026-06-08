import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createBreweryWorkflow } from "../../../workflows/manage-brewery"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "brewery",
    fields: [
      "id",
      "name",
      "slug",
      "description",
      "location",
      "logo_url",
      "hero_image_url",
      "website_url",
      "untappd_url",
      "facebook_url",
      "instagram_url",
      "is_active",
      "products.id",
    ],
  })

  const breweries = (data as any[])
    .map(({ products, ...b }) => ({
      ...b,
      product_count: (products ?? []).length,
    }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))

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
