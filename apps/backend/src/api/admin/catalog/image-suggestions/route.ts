import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "thumbnail", "images"],
  })

  const missingImages = (products as any[]).filter(
    (p) => !p.thumbnail && (!p.images || p.images.length === 0)
  )

  const suggestions = missingImages.map((p) => ({
    product_id: p.id,
    title: p.title,
    status: "pending",
    suggested_source: "untappd",
  }))

  res.json({ suggestions, count: suggestions.length })
}
