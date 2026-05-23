import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

/**
 * Forces the Medusa Index Engine to re-sync from the source-of-truth DB.
 *
 * After link.dismiss() removes product<->sales_channel links, the index
 * engine doesn't auto-update because dismiss doesn't emit the events the
 * engine listens for. Result: storefront /store/products keeps returning
 * stale ghost products from the index even though the DB is clean.
 *
 * Strategy "reset" wipes the index metadata and replays from current state.
 *
 * Run with:
 *   pnpm exec medusa exec ./src/scripts/reindex-storefront.ts
 */
export default async function reindex({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const indexModule: any = container.resolve(Modules.INDEX)
  if (!indexModule) {
    logger.error("Index module not available — is MEDUSA_FF_INDEX_ENGINE=true?")
    return
  }

  logger.info("Triggering full index sync (strategy=full)...")
  await indexModule.sync({ strategy: "full" })
  logger.info("Full sync completed.")
}
