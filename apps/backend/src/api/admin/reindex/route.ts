import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { Client } from "pg"

/**
 * POST /admin/reindex
 *
 * Clears the Medusa Index Engine's stale watermarks and runs a full sync.
 * Required after bulk imports because the index watermark can become stale,
 * causing /store/products to return empty results even though the DB is correct.
 *
 * Strategy:
 *   1. Truncate index_data, index_relation, index_sync (wipes stale cache)
 *   2. Delete index_metadata (removes the stale watermark)
 *   3. Call indexModule.sync({ strategy: "full" }) — now works because there
 *      is no watermark claiming the index is current.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    // Step 1: Clear stale index state via direct DB connection.
    // Cannot use Medusa module services for this — the Index Module exposes
    // no method to clear its own tables, and using the pg client directly is
    // the only reliable path.
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      return res.status(500).json({ success: false, message: "DATABASE_URL not set" })
    }

    const client = new Client({ connectionString: dbUrl })
    await client.connect()
    try {
      await client.query("TRUNCATE index_data, index_relation, index_sync")
      await client.query("DELETE FROM index_metadata")
      logger.info("[Reindex] Index tables cleared")
    } finally {
      await client.end()
    }

    // Step 2: Full sync. With the watermark gone, the Index Engine will
    // rebuild from the current DB state rather than skipping as "up to date".
    const indexModule = req.scope.resolve(Modules.INDEX) as any
    if (indexModule?.sync) {
      await indexModule.sync({ strategy: "full" })
      logger.info("[Reindex] Full sync completed")
    } else {
      logger.warn("[Reindex] Index module not available — is MEDUSA_FF_INDEX_ENGINE=true?")
    }

    res.json({ success: true })
  } catch (err: any) {
    logger.error(`[Reindex] Failed: ${err.message}`)
    res.status(500).json({ success: false, message: err.message })
  }
}
