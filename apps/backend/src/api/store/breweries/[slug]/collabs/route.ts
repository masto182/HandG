import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { slug } = req.params
  const breweryService = req.scope.resolve("brewery") as any
  const productModule = req.scope.resolve(Modules.PRODUCT) as any

  const breweries = await breweryService.listBreweries({ slug })
  if (!breweries.length) {
    return res.status(404).json({ message: "Brewery not found" })
  }

  const brewery = breweries[0]
  const allProducts = await productModule.listProducts(
    {},
    { select: ["id", "title", "handle", "thumbnail", "metadata", "created_at"] }
  )

  const collabs = allProducts.filter((p: any) => {
    const meta = p.metadata as any
    if (!meta?.collab_partners || !Array.isArray(meta.collab_partners)) return false
    return meta.collab_partners.includes(brewery.slug)
  })

  const enriched = collabs.map((p: any) => {
    const meta = p.metadata as any
    const primaryBreweryName = meta?.brewery_name || meta?.brewery || ""
    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      thumbnail: p.thumbnail,
      metadata: p.metadata,
      created_at: p.created_at,
      primary_brewery_name: primaryBreweryName,
    }
  })

  res.json({ collabs: enriched, count: enriched.length })
}
