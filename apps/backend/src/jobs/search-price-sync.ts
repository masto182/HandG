import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getMeiliClient, PRODUCTS_INDEX } from "../lib/meilisearch"
import { getMinPrices } from "../lib/search-price"

export default async function searchPriceSync(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as any
  const productModule = container.resolve(Modules.PRODUCT)

  const products = await productModule.listProducts(
    { status: ["published"] },
    { select: ["id"], take: 5000 }
  )
  const ids = products.map((p: any) => p.id)
  if (ids.length === 0) return

  const prices = await getMinPrices(container, ids)
  const docs = ids.map((id: string) => ({ id, min_price: prices.get(id) ?? 0 }))

  const meili = await getMeiliClient()
  await meili.index(PRODUCTS_INDEX).updateDocuments(docs, { primaryKey: "id" })
  logger.info(`[search-price-sync] refreshed min_price for ${docs.length} products`)
}

export const config = {
  name: "search-price-sync",
  schedule: "*/15 * * * *",
}
