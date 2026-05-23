/**
 * One-shot migration: copy product_like rows into wishlist with mode="like".
 *
 * Run: pnpm exec medusa exec ./src/scripts/migrate-product-likes-to-wishlist.ts
 *
 * Idempotent: skips rows that already exist in wishlist with mode="like".
 *
 * After this script has been run once and you've verified counts match,
 * `DROP TABLE product_like;` is safe.
 *
 * Implementation note: the product_like module has been removed from
 * medusa-config (it's archived under _archive/2026-sprint-11/). To migrate
 * data, this script reads the legacy table directly via the Medusa data
 * source; it does NOT depend on the unregistered service.
 */
import { ExecArgs } from "@medusajs/framework/types"

export default async function migrateProductLikesToWishlist({ container }: ExecArgs) {
  const logger = container.resolve("logger") as { info: (m: string) => void; warn: (m: string) => void }

  // Resolve raw connection via @mikro-orm pgConnection (registered by Medusa).
  let manager: any
  try {
    manager = container.resolve("__pg_connection__" as any)
  } catch {
    logger.warn("Postgres connection not resolvable; cannot migrate")
    return
  }

  // Read legacy rows directly from product_like table.
  let likes: Array<{ customer_id: string; product_id: string }> = []
  try {
    likes = (await manager.raw(
      "SELECT customer_id, product_id FROM product_like WHERE deleted_at IS NULL"
    )) as Array<{ customer_id: string; product_id: string }>
    // Knex returns { rows: [...] } for some drivers; normalise.
    if (!Array.isArray(likes) && (likes as any)?.rows) {
      likes = (likes as any).rows
    }
  } catch (e: any) {
    if ((e?.message || "").includes("does not exist")) {
      logger.info("product_like table does not exist; nothing to migrate")
      return
    }
    throw e
  }
  logger.info(`Found ${likes.length} product_like rows`)

  const wishlistService = container.resolve("wishlist") as any
  let copied = 0
  let skipped = 0
  for (const like of likes) {
    const existing = await wishlistService.listWishlists({
      customer_id: like.customer_id,
      product_id: like.product_id,
      mode: "like",
    })
    if (existing.length) {
      skipped++
      continue
    }
    await wishlistService.createWishlists({
      customer_id: like.customer_id,
      product_id: like.product_id,
      mode: "like",
    })
    copied++
  }

  logger.info(`migrate-product-likes-to-wishlist: copied=${copied} skipped=${skipped}`)
}
