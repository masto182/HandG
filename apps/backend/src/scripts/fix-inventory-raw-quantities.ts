import type { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * One-off data fix (idempotent, safe to re-run):
 *
 * Some inventory_level rows have their plain `stocked_quantity` /
 * `reserved_quantity` columns populated but the companion `raw_*` BigNumber
 * JSON columns left NULL (written by a process that bypassed Medusa's
 * inventory module — e.g. a direct SQL import). Medusa's availability check
 * reads the raw column, so these rows are treated as zero stock regardless
 * of what the plain column shows, causing add-to-cart to fail with
 * "insufficient_inventory" even when stock is genuinely available.
 *
 * Fix: round-trip each affected row through updateInventoryLevels() so the
 * module recomputes the raw BigNumber columns from the plain values.
 *
 * Run via: npx medusa exec ./src/scripts/fix-inventory-raw-quantities.ts
 */

export default async function fixInventoryRawQuantities({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const inventoryModule = container.resolve(Modules.INVENTORY) as any

  const levels = await inventoryModule.listInventoryLevels({})
  const affected = levels.filter((l: any) => l.raw_stocked_quantity == null)

  logger.info(`Found ${affected.length} inventory_level row(s) with NULL raw_stocked_quantity`)

  let fixed = 0
  for (const level of affected) {
    await inventoryModule.updateInventoryLevels([
      {
        inventory_item_id: level.inventory_item_id,
        location_id: level.location_id,
        stocked_quantity: level.stocked_quantity,
        reserved_quantity: level.reserved_quantity,
      },
    ])
    fixed++
  }

  logger.info(`Backfilled raw quantity columns for ${fixed} row(s).`)

  const remaining = await inventoryModule.listInventoryLevels({})
  const stillNull = remaining.filter((l: any) => l.raw_stocked_quantity == null)
  if (stillNull.length > 0) {
    logger.warn(
      `${stillNull.length} row(s) still have NULL raw_stocked_quantity after fix — investigate.`
    )
  } else {
    logger.info("All inventory_level rows now have raw_stocked_quantity populated.")
  }
}
