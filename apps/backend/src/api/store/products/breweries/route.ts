import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Batch fetch the linked breweries for a set of product IDs.
 * Used by storefront listProducts to hydrate the breweries list onto each
 * product card without going through Medusa core /store/products fields.
 *
 * GET /store/products/breweries?ids=p1,p2,p3
 *   -> { breweries_by_product: { [productId]: Array<{id,slug,name}> } }
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const idsParam = (req.query.ids as string) || ""
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 200)

  if (!ids.length) {
    return res.json({ breweries_by_product: {} })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "breweries.id", "breweries.slug", "breweries.name"],
    filters: { id: ids },
  })

  const map: Record<string, Array<{ id: string; slug: string; name: string }>> = {}
  for (const p of (data as any[]) || []) {
    map[p.id] = (p.breweries || []).map((b: any) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
    }))
  }

  res.json({ breweries_by_product: map })
}
