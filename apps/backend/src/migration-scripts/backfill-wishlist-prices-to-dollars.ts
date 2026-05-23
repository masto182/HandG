/**
 * Backfill: convert wishlist target_price + admin_offer_price from cents -> dollars.
 *
 * Background: prior to Sprint X the codebase incorrectly stored these fields
 * in cents (e.g., 1000 for $10), even though Medusa 2.x stores monetary
 * values in major units (dollars). The mismatch caused the buy-at-price
 * approval workflow to compute negative deltas that got clamped to 0,
 * silently producing zero-discount promotions.
 *
 * This script divides existing values by 100. Idempotency is preserved by
 * the standard Medusa migration-script tracking (only runs once per
 * database). The `>= 100` guard is a defence-in-depth check so re-running
 * (e.g., a manual restore from a partial backup) is safe.
 */

import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework"
import { WISHLIST_MODULE } from "../modules/wishlist"

export default async function backfillWishlistPricesToDollars({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const wishlistService = container.resolve(WISHLIST_MODULE) as any

  const items = await wishlistService.listWishlists({})
  let targetCount = 0
  let offerCount = 0

  for (const item of items) {
    const updates: Record<string, number> = {}
    if (typeof item.target_price === "number" && item.target_price >= 100) {
      updates.target_price = item.target_price / 100
      targetCount++
    }
    if (
      typeof item.admin_offer_price === "number" &&
      item.admin_offer_price >= 100
    ) {
      updates.admin_offer_price = item.admin_offer_price / 100
      offerCount++
    }
    if (Object.keys(updates).length === 0) continue
    await wishlistService.updateWishlists({ id: item.id, ...updates })
  }

  logger.info(
    `[backfill-wishlist-prices-to-dollars] target_price rows updated: ${targetCount}, admin_offer_price rows updated: ${offerCount}`
  )
}
