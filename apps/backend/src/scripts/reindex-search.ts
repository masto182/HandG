import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getMeiliClient, PRODUCTS_INDEX, configureIndex } from "../lib/meilisearch"

// Storefront filter groups — deliberately coarser than the 31-style taxonomy
// but splits the IPA family (which otherwise dominates the catalog) into its
// two highest-ABV tiers. Pale Ale has no products currently and correctly
// falls through to "" (no filter bucket) rather than showing an empty group.
function getFilterGroup(slug: string | undefined, family: string | undefined): string {
  if (slug === "triple-ipa") return "Triple IPA"
  if (slug === "double-ipa") return "Double IPA"
  if (family === "IPA") return "IPA"
  if (family === "Dark" || family === "Sour" || family === "Lager") return family
  return ""
}

const MEILI_HOST = process.env.MEILI_HOST || "http://localhost:7700"
const MEILI_KEY = process.env.MEILI_MASTER_KEY || ""

async function waitForMeiliTask(taskUid: number, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${MEILI_HOST}/tasks/${taskUid}`, {
        headers: MEILI_KEY ? { Authorization: `Bearer ${MEILI_KEY}` } : {},
      })
      if (res.ok) {
        const task = await res.json()
        if (task.status === "succeeded" || task.status === "failed") return task
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Task ${taskUid} did not complete within ${timeoutMs}ms`)
}

export default async function reindexSearch({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const meili = await getMeiliClient()

  console.log("[Search] Configuring Meilisearch index...")
  await configureIndex()

  console.log("[Search] Fetching all products...")
  const products = await productModule.listProducts(
    { status: ["published"] },
    {
      select: ["id", "title", "handle", "description", "metadata", "created_at", "thumbnail"],
      relations: ["variants", "tags"],
    }
  )

  const styleMap = new Map<string, { name: string; family: string; slug: string }>()
  const hopMap = new Map<string, string[]>()
  const hopCountryMap = new Map<string, string[]>()
  const breweryCountMap = new Map<string, number>()
  try {
    const { data: linked } = await query.graph({
      entity: "product",
      fields: ["id", "beer_style.*", "hops.*", "hops.country_code", "breweries.id"],
      filters: { id: products.map((p: any) => p.id) },
    })
    for (const item of linked || []) {
      if ((item as any).beer_style) {
        styleMap.set((item as any).id, {
          name: (item as any).beer_style.name,
          family: (item as any).beer_style.family,
          slug: (item as any).beer_style.slug,
        })
      }
      const linkedHops = (item as any).hops || []
      if (linkedHops.length > 0) {
        hopMap.set(
          (item as any).id,
          linkedHops.map((h: any) => h.name)
        )
        hopCountryMap.set(
          (item as any).id,
          linkedHops
            .map((h: any) => h.country_code)
            .filter(Boolean)
            .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
        )
      }
      const linkedBreweries = (item as any).breweries || []
      breweryCountMap.set((item as any).id, linkedBreweries.length)
    }
  } catch {}

  // productModule.listProducts (used above for base fields) never populates
  // the inventory_quantity virtual field — same Medusa bug documented in
  // api/store/inventory/by-variant-ids/route.ts and api/admin/wishlist/route.ts.
  // Query product_variant directly, batched across all products, and sum
  // available_quantity (fallback stocked-reserved) per product.
  const inventoryQtyMap = new Map<string, number>()
  try {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "product_id",
        "inventory_items.inventory.location_levels.available_quantity",
        "inventory_items.inventory.location_levels.stocked_quantity",
        "inventory_items.inventory.location_levels.reserved_quantity",
      ],
      filters: { product_id: products.map((p: any) => p.id) },
    })
    for (const v of variants as any[]) {
      let total = 0
      for (const ii of v.inventory_items || []) {
        for (const ll of ii.inventory?.location_levels || []) {
          const avail = ll?.available_quantity
          total +=
            avail != null
              ? Number(avail)
              : Number(ll?.stocked_quantity ?? 0) - Number(ll?.reserved_quantity ?? 0)
        }
      }
      inventoryQtyMap.set(v.product_id, (inventoryQtyMap.get(v.product_id) || 0) + total)
    }
  } catch {}

  const documents = products.map((p: any) => {
    const meta = p.metadata || {}
    const desc = p.description || ""
    const isCollab = (breweryCountMap.get(p.id) || 0) > 1
    const createdAt = p.created_at ? new Date(p.created_at).getTime() : 0
    const inventoryQty = inventoryQtyMap.get(p.id) || 0

    const hops: string[] = hopMap.get(p.id) || (Array.isArray(meta.hops) ? meta.hops : [])
    const packagedAtTs = meta.packaged_at
      ? new Date(meta.packaged_at).getTime()
      : meta.released_date
        ? new Date(meta.released_date).getTime()
        : createdAt

    const linkedStyle = styleMap.get(p.id)

    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      description: desc,
      brewery: meta.brewery || "",
      style: linkedStyle?.name || meta.style || "",
      style_family: getFilterGroup(linkedStyle?.slug, linkedStyle?.family),
      hops,
      hop_countries: hopCountryMap.get(p.id) || [],
      abv: parseFloat(meta.abv) || 0,
      untappd_score: parseFloat(meta.untappd_score) || 0,
      packaged_at_ts: packagedAtTs,
      created_at_ts: createdAt,
      thumbnail: p.thumbnail || null,
      is_collab: isCollab,
      tags: (p as any).tags?.map((t: any) => t.value).filter(Boolean) ?? [],
      inventory_qty: inventoryQty,
    }
  })

  const index = meili.index(PRODUCTS_INDEX)

  const statsBefore = await index.getStats()
  console.log(`[Search] Current index: ${statsBefore.numberOfDocuments} documents`)
  console.log(`[Search] Published products in DB: ${documents.length}`)

  console.log(`[Search] Purging index for clean rebuild...`)
  const deleteTask = await index.deleteAllDocuments()
  await waitForMeiliTask(deleteTask.taskUid)
  console.log(`[Search] Index purged.`)

  console.log(`[Search] Indexing ${documents.length} products...`)
  const addTask = await index.addDocuments(documents, { primaryKey: "id" })
  await waitForMeiliTask(addTask.taskUid)

  const statsAfter = await index.getStats()
  const docCount = statsAfter.numberOfDocuments
  console.log(`[Search] Reindex complete. Index now has ${docCount} documents.`)
}
