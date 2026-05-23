import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { configureIndex, getMeiliClient, PRODUCTS_INDEX } from "../lib/meilisearch"

const DRIFT_THRESHOLD = 5

export default async function searchIndexRefresh(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as any
  const productModule = container.resolve(Modules.PRODUCT)

  logger.info("[Search Index] Starting daily refresh...")

  try {
    await configureIndex()
    logger.info("[Search Index] MeiliSearch index settings updated (ranking rules, synonyms, facets)")
  } catch (err: any) {
    logger.warn(`[Search Index] Could not update MeiliSearch settings: ${err.message}`)
  }

  const [, dbCount] = await productModule.listAndCountProducts({ status: ["published"] })

  let meiliDocCount = 0
  try {
    const meili = await getMeiliClient()
    const index = meili.index(PRODUCTS_INDEX)
    const stats = await index.getStats()
    meiliDocCount = stats.numberOfDocuments ?? 0
  } catch (err: any) {
    logger.warn(`[Search Index] Could not fetch MeiliSearch stats: ${err.message}`)
    return
  }

  const drift = Math.abs(meiliDocCount - dbCount)
  logger.info(`[Search Index] DB: ${dbCount} published | MeiliSearch: ${meiliDocCount} indexed | Drift: ${drift}`)

  if (drift > DRIFT_THRESHOLD) {
    logger.warn(`[Search Index] Drift exceeds threshold (${DRIFT_THRESHOLD}). Triggering full reindex...`)

    try {
      const reindexModule = (await import("../scripts/reindex-search.js")) as unknown as { default: (args: any) => Promise<void> }
      await reindexModule.default({ container } as any)
      logger.info("[Search Index] Full reindex completed successfully")
    } catch (err: any) {
      logger.error(`[Search Index] Full reindex failed: ${err.message}`)
    }
  } else if (drift > 0) {
    logger.info(`[Search Index] Minor drift (${drift} docs) within threshold. No action needed.`)
  } else {
    logger.info("[Search Index] Index is in sync. No drift detected.")
  }

  logger.info("[Search Index] Complete")
}

export const config = {
  name: "search-index-refresh",
  schedule: "0 18 * * *",
}
