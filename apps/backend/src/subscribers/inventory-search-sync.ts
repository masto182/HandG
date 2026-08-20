import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Bridges inventory/reservation changes into the search index.
 *
 * product-search-indexer.ts already recomputes `inventory_qty` fresh from
 * live inventory whenever it sees product.created/updated/deleted — but
 * nothing previously triggered that on an actual stock change (an order
 * being placed, a reservation held/released, a manual stock adjustment).
 * Result: MeiliSearch's cached `inventory_qty` only updated when someone
 * edited the product itself, so the storefront's "beers found" count and
 * the sidebar filter counts (which read facetDistribution straight from
 * Meili, with no live recheck) could silently drift stale after every sale
 * until an unrelated product edit or a manual reindex happened to fix it.
 *
 * This subscriber resolves the affected product(s) for any inventory-item
 * whose stock/reservation changed, and simply re-emits product.updated for
 * each — reusing the existing indexer rather than duplicating its logic.
 */

type Logger = {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

// Medusa's generic per-model CRUD events pass either a single {id} or an
// array of {id} (bulk operations) — normalize to a flat list of ids.
function normalizeIds(data: unknown): string[] {
  if (Array.isArray(data)) {
    return data.map((d: any) => d?.id).filter(Boolean)
  }
  const id = (data as any)?.id
  return id ? [id] : []
}

export default async function inventorySearchSync({
  event,
  container,
}: SubscriberArgs<{ id: string } | { id: string }[]>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger
  const inventoryModule = container.resolve(Modules.INVENTORY) as any
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const eventBus = container.resolve(Modules.EVENT_BUS) as any

  const ids = normalizeIds(event.data)
  if (ids.length === 0) return

  let inventoryItemIds: string[] = []
  try {
    if (event.name.includes("reservation-item")) {
      const items = await inventoryModule.listReservationItems({ id: ids })
      inventoryItemIds = items.map((i: any) => i.inventory_item_id).filter(Boolean)
    } else {
      const levels = await inventoryModule.listInventoryLevels({ id: ids })
      inventoryItemIds = levels.map((l: any) => l.inventory_item_id).filter(Boolean)
    }
  } catch (err) {
    logger.warn(
      `[inventory-search-sync] Could not resolve inventory_item_id for ${event.name} ${ids.join(",")}: ${err instanceof Error ? err.message : String(err)}`
    )
    return
  }

  inventoryItemIds = [...new Set(inventoryItemIds)]
  if (inventoryItemIds.length === 0) return

  let productIds: string[] = []
  try {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "product_id"],
      filters: { "inventory_items.inventory_item_id": inventoryItemIds } as any,
    })
    productIds = [...new Set((variants as any[]).map((v) => v.product_id).filter(Boolean))]
  } catch (err) {
    logger.warn(
      `[inventory-search-sync] Could not resolve product(s) for inventory item(s) ${inventoryItemIds.join(",")}: ${err instanceof Error ? err.message : String(err)}`
    )
    return
  }

  if (productIds.length === 0) return

  for (const id of productIds) {
    await eventBus.emit({ name: "product.updated", data: { id } })
  }
  logger.info(
    `[inventory-search-sync] ${event.name} -> refreshed search index for product(s): ${productIds.join(", ")}`
  )
}

export const config: SubscriberConfig = {
  event: [
    "inventory.inventory-level.updated",
    "inventory.reservation-item.created",
    "inventory.reservation-item.updated",
    "inventory.reservation-item.deleted",
  ],
}
