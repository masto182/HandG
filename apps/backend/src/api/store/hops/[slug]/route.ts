import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { HOP_MODULE } from "../../../../modules/hop"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hopService = req.scope.resolve(HOP_MODULE) as any
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { slug } = req.params

  const hops = await hopService.listHops({ slug })
  if (!hops.length) {
    res.status(404).json({ error: "Hop not found" })
    return
  }

  const hop = hops[0]

  const { data } = await query.graph({
    entity: "hop",
    fields: ["id", "products.*", "products.variants.*"],
    filters: { id: hop.id },
  })

  const hopWithProducts = (data as any[])?.[0]
  const products = hopWithProducts?.products || []

  res.json({
    hop: {
      id: hop.id,
      name: hop.name,
      slug: hop.slug,
      origin: hop.origin,
      flavor_profile: hop.flavor_profile,
      description: hop.description,
      image_url: hop.image_url,
      product_count: products.length,
    },
    products,
  })
}
