/**
 * Compute total shipment weight in grams from a list of cart line items.
 *
 * Resolution per item:
 *   1. variant.weight (Medusa product variant weight, in grams by convention)
 *   2. product.weight (parent product weight)
 *   3. defaultG fallback (SiteConfig shipping_default_item_weight_g, default 750)
 *
 * Multiplied by quantity.
 */
export type WeightedItem = {
  quantity: number
  variant?: { weight?: number | null } | null
  product?: { weight?: number | null } | null
}

export function computeShipmentWeightG(items: WeightedItem[] | undefined | null, defaultG: number): number {
  if (!items?.length) return 0
  let total = 0
  for (const item of items) {
    const qty = Math.max(0, Math.floor(item.quantity ?? 0))
    if (qty === 0) continue
    const w = item.variant?.weight ?? item.product?.weight ?? defaultG
    if (typeof w !== "number" || !Number.isFinite(w) || w <= 0) {
      total += defaultG * qty
    } else {
      total += w * qty
    }
  }
  return total
}
