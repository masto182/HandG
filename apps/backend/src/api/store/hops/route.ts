import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HOP_MODULE } from "../../../modules/hop"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hopService = req.scope.resolve(HOP_MODULE) as any
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const allHops = await hopService.listHops({ is_active: true })

  const { data: hopsWithProducts } = await query.graph({
    entity: "hop",
    fields: ["id", "products.id"],
    filters: { is_active: true },
  })

  const countMap = new Map<string, number>()
  for (const hop of (hopsWithProducts as any[]) || []) {
    countMap.set(hop.id, hop.products?.length || 0)
  }

  const hops = allHops
    .map((hop: any) => ({
      id: hop.id,
      name: hop.name,
      slug: hop.slug,
      origin: hop.origin,
      flavor_profile: hop.flavor_profile,
      product_count: countMap.get(hop.id) || 0,
    }))
    .filter((hop: any) => hop.product_count > 0)
    .sort((a: any, b: any) => b.product_count - a.product_count)

  res.json({ hops, count: hops.length })
}
