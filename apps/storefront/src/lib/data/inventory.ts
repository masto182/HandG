"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

/**
 * Fetches inventory quantities for a set of variant IDs.
 *
 * Uses our custom /store/inventory/by-variant-ids endpoint because
 * the upstream `+variants.inventory_quantity` field on the product list
 * endpoint throws on Medusa 2.15.2 (Mikro-ORM "Property '' does not
 * exist on Product"). Returns an empty map on any error so callers
 * can default to "stock unknown" rather than crashing.
 */
export async function getVariantInventory(
  variantIds: string[]
): Promise<Record<string, number>> {
  if (!variantIds.length) return {}

  const headers = { ...(await getAuthHeaders()) }

  try {
    const { inventory } = await sdk.client.fetch<{
      inventory: Record<string, number>
    }>(`/store/inventory/by-variant-ids`, {
      method: "GET",
      query: { ids: variantIds.join(",") },
      headers,
      cache: "no-store",
    })
    return inventory ?? {}
  } catch {
    return {}
  }
}

type ProductWithVariants = {
  variants?: Array<{ id?: string; inventory_quantity?: number | null } & Record<string, unknown>> | null
} & Record<string, unknown>

/**
 * Mutates each variant in the given products list to include
 * `inventory_quantity` based on a single batched call to our
 * inventory endpoint. Safe no-op if no variants or on fetch failure.
 */
export async function hydrateInventoryQuantity<T extends ProductWithVariants>(
  products: T[]
): Promise<T[]> {
  const ids: string[] = []
  for (const p of products) {
    for (const v of p.variants ?? []) {
      if (v.id) ids.push(v.id)
    }
  }
  if (!ids.length) return products

  const map = await getVariantInventory(ids)
  for (const p of products) {
    for (const v of p.variants ?? []) {
      if (v.id && map[v.id] != null) {
        v.inventory_quantity = map[v.id]
      }
    }
  }
  return products
}
