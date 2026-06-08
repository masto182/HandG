import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { slug } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: breweries } = await query.graph({
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
    filters: { slug },
  })

  if (!breweries.length) {
    return res.status(404).json({ message: "Brewery not found" })
  }

  const { products, ...brewery } = breweries[0] as any
  return res.json({
    brewery,
    product_ids: ((products ?? []) as any[]).map((p) => p.id),
  })
}
