import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data } = await query.graph({
      entity: "product",
      fields: [
        "beer_style.id",
        "beer_style.name",
        "beer_style.slug",
        "beer_style.family",
        "beer_style.description",
        "beer_style.color_hex",
      ],
      filters: { id: productId },
    })
    const style = (data?.[0] as any)?.beer_style || null
    res.json({ product_id: productId, beer_style: style })
  } catch {
    res.json({ product_id: productId, beer_style: null })
  }
}
