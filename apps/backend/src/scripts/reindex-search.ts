import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getMeiliClient, PRODUCTS_INDEX, configureIndex } from "../lib/meilisearch"

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
    { select: ["id", "title", "handle", "description", "metadata", "created_at", "thumbnail"], relations: ["variants"] }
  )

  const styleMap = new Map<string, { name: string; family: string }>()
  const hopMap = new Map<string, string[]>()
  try {
    const { data: linked } = await query.graph({
      entity: "product",
      fields: ["id", "beer_style.*", "hops.*"],
      filters: { id: products.map((p: any) => p.id) },
    })
    for (const item of linked || []) {
      if ((item as any).beer_style) {
        styleMap.set((item as any).id, {
          name: (item as any).beer_style.name,
          family: (item as any).beer_style.family,
        })
      }
      const linkedHops = (item as any).hops || []
      if (linkedHops.length > 0) {
        hopMap.set((item as any).id, linkedHops.map((h: any) => h.name))
      }
    }
  } catch {}

  const documents = products.map((p: any) => {
    const meta = p.metadata || {}
    const desc = p.description || ""
    const isCollab = desc.toLowerCase().includes("colab") || desc.toLowerCase().includes("collab")
    const createdAt = p.created_at ? new Date(p.created_at).getTime() : 0
    const inventoryQty = p.variants?.[0]?.inventory_quantity || 0

    const hops: string[] = hopMap.get(p.id) || (Array.isArray(meta.hops) ? meta.hops : [])
    const packagedAtTs = meta.packaged_at ? new Date(meta.packaged_at).getTime() : createdAt

    const linkedStyle = styleMap.get(p.id)

    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      description: desc,
      brewery: meta.brewery || "",
      style: linkedStyle?.name || meta.style || "",
      style_family: linkedStyle?.family || "",
      hops,
      abv: parseFloat(meta.abv) || 0,
      untappd_score: parseFloat(meta.untappd_score) || 0,
      packaged_at_ts: packagedAtTs,
      created_at_ts: createdAt,
      thumbnail: p.thumbnail || null,
      is_collab: isCollab,
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
