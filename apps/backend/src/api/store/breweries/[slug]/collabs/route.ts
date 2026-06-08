import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { slug } = req.params
  const breweryService = req.scope.resolve("brewery") as any
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const breweries = await breweryService.listBreweries({ slug })
  if (!breweries.length) {
    return res.status(404).json({ message: "Brewery not found" })
  }
  const brewery = breweries[0]

  // Reverse lookup via the brewery <-> product list link.
  // Filter out beers where this brewery is the primary (we only want collabs).
  const { data } = await query.graph({
    entity: "brewery",
    fields: [
      "id",
      "slug",
      "products.id",
      "products.title",
      "products.handle",
      "products.thumbnail",
      "products.metadata",
      "products.created_at",
      "products.status",
    ],
    filters: { id: brewery.id },
  })

  const linked = ((data as any[])?.[0]?.products || []) as any[]
  const collabs = linked.filter((p) => {
    if (!p || p.status !== "published") return false
    const meta = (p.metadata || {}) as any
    return meta.brewery_slug !== brewery.slug
  })

  const enriched = collabs.map((p: any) => {
    const meta = (p.metadata || {}) as any
    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      thumbnail: p.thumbnail,
      metadata: p.metadata,
      created_at: p.created_at,
      primary_brewery_name: meta?.brewery_name || meta?.brewery || "",
    }
  })

  res.json({ collabs: enriched, count: enriched.length })
}
