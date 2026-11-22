export type VariantAvailability = {
  available: number
  manage_inventory: boolean
  allow_backorder: boolean
}

export type VariantAvailabilityMap = Record<string, VariantAvailability>

export type LineStockStatus =
  | { kind: "available" }
  | { kind: "sold_out" }
  | { kind: "insufficient"; available: number }
  | { kind: "unknown" }

export function getLineStockStatus(
  variantId: string | null | undefined,
  quantity: number,
  availability: VariantAvailabilityMap,
): LineStockStatus {
  if (!variantId) return { kind: "unknown" }

  const stock = availability[variantId]
  if (!stock) return { kind: "unknown" }
  if (!stock.manage_inventory || stock.allow_backorder) {
    return { kind: "available" }
  }
  if (stock.available <= 0) return { kind: "sold_out" }
  if (quantity > stock.available) {
    return { kind: "insufficient", available: stock.available }
  }
  return { kind: "available" }
}

export function getUnavailableLineIds<
  T extends {
    id: string
    variant_id?: string | null
    quantity: number
  },
>(items: T[], availability: VariantAvailabilityMap): string[] {
  return items
    .filter((item) => {
      const status = getLineStockStatus(
        item.variant_id,
        item.quantity,
        availability,
      )
      return status.kind === "sold_out" || status.kind === "insufficient"
    })
    .map((item) => item.id)
}
