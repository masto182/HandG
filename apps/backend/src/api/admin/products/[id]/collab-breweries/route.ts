// workflow-exempt
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Manage collaborator breweries on a product via the brewery <-> product
 * link table. Primary brewery is identified by product.metadata.brewery_slug;
 * any other linked breweries are considered collaborators.
 *
 * GET    -> { collab_brewery_slugs: string[] }
 * POST   { brewery_slugs: string[] } -> diff vs current collabs and create/dismiss
 *        the link rows so the set matches.
 */

async function loadProductBreweries(req: AuthenticatedMedusaRequest, productId: string) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "metadata", "breweries.id", "breweries.slug", "breweries.name"],
    filters: { id: productId },
  })
  const product = (data as any[])?.[0]
  return product || null
}

function splitPrimaryAndCollabs(product: any) {
  const primarySlug: string | null = (product?.metadata as any)?.brewery_slug || null
  const linked: Array<{ id: string; slug: string; name: string }> = product?.breweries || []
  const primary = primarySlug ? linked.find((b) => b.slug === primarySlug) || null : null
  const collabs = linked.filter((b) => !primary || b.id !== primary.id)
  return { primary, collabs }
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const product = await loadProductBreweries(req, id)
  if (!product) {
    res.status(404).json({ error: "Product not found" })
    return
  }
  const { collabs } = splitPrimaryAndCollabs(product)
  res.json({ collab_brewery_slugs: collabs.map((b) => b.slug) })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const body = (req.body || {}) as { brewery_slugs?: string[] }
  const requestedSlugs = Array.isArray(body.brewery_slugs) ? body.brewery_slugs : null
  if (!requestedSlugs) {
    res.status(400).json({ error: "brewery_slugs array is required" })
    return
  }

  const breweryService = req.scope.resolve("brewery") as any
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK) as any

  const product = await loadProductBreweries(req, id)
  if (!product) {
    res.status(404).json({ error: "Product not found" })
    return
  }

  const { primary, collabs: currentCollabs } = splitPrimaryAndCollabs(product)
  const currentSlugs = new Set(currentCollabs.map((b) => b.slug))

  // Resolve requested slugs to brewery rows
  const allBreweries = await breweryService.listBreweries({})
  const breweryBySlug = new Map<string, any>(allBreweries.map((b: any) => [b.slug, b]))
  const requested: any[] = []
  const unknown: string[] = []
  for (const slug of requestedSlugs) {
    if (primary && primary.slug === slug) continue // can't be both primary and collab
    const b = breweryBySlug.get(slug)
    if (b) requested.push(b)
    else unknown.push(slug)
  }
  const requestedSet = new Set(requested.map((b) => b.slug))

  const toAdd = requested.filter((b) => !currentSlugs.has(b.slug))
  const toRemove = currentCollabs.filter((b) => !requestedSet.has(b.slug))

  for (const b of toAdd) {
    try {
      await link.create({
        brewery: { brewery_id: b.id },
        [Modules.PRODUCT]: { product_id: id },
      })
    } catch {}
  }
  for (const b of toRemove) {
    try {
      await link.dismiss({
        brewery: { brewery_id: b.id },
        [Modules.PRODUCT]: { product_id: id },
      })
    } catch {}
  }

  // Brewery <-> product link mutations don't emit product.updated automatically.
  // Trigger the search reindex subscriber explicitly so MeiliSearch is_collab stays in sync.
  if (toAdd.length > 0 || toRemove.length > 0) {
    try {
      const eventBus = req.scope.resolve(Modules.EVENT_BUS) as
        | {
            emit(events: { name: string; data: Record<string, unknown> }[]): Promise<void>
          }
        | undefined
      if (eventBus && typeof eventBus.emit === "function") {
        await eventBus.emit([{ name: "product.updated", data: { id } }])
      }
    } catch {}
  }

  res.json({
    collab_brewery_slugs: requested.map((b) => b.slug),
    added: toAdd.map((b) => b.slug),
    removed: toRemove.map((b) => b.slug),
    unknown,
  })
}
