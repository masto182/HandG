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

export function getUnavailableLines<
  T extends {
    id: string
    variant_id?: string | null
    quantity: number
  },
>(items: T[], availability: VariantAvailabilityMap): T[] {
  return items.filter((item) => {
    const status = getLineStockStatus(
      item.variant_id,
      item.quantity,
      availability,
    )
    return status.kind === "sold_out" || status.kind === "insufficient"
  })
}

export function getUnavailableLineIds<
  T extends {
    id: string
    variant_id?: string | null
    quantity: number
  },
>(items: T[], availability: VariantAvailabilityMap): string[] {
  return getUnavailableLines(items, availability).map((item) => item.id)
}

export function describeUnavailableItems(titles: string[]): string {
  const names = titles.filter(Boolean)
  if (names.length === 0) return ""
  if (names.length === 1) return `${names[0]} is no longer available.`
  const head = names.slice(0, -1).join(", ")
  return `${head} and ${names[names.length - 1]} are no longer available.`
}

export type LineFixAction =
  | { id: string; kind: "remove" }
  | { id: string; kind: "reduce"; quantity: number }

export function getUnavailableLineActions<
  T extends {
    id: string
    variant_id?: string | null
    quantity: number
  },
>(items: T[], availability: VariantAvailabilityMap): LineFixAction[] {
  const actions: LineFixAction[] = []
  for (const item of items) {
    const status = getLineStockStatus(
      item.variant_id,
      item.quantity,
      availability,
    )
    if (status.kind === "sold_out") {
      actions.push({ id: item.id, kind: "remove" })
    } else if (status.kind === "insufficient") {
      actions.push({ id: item.id, kind: "reduce", quantity: status.available })
    }
  }
  return actions
}
