import type { HttpTypes } from "@medusajs/types"
import type { GateItem } from "@modules/cart/components/early-access-cart-gate"

export function toGateItems(
  cart: HttpTypes.StoreCart | null | undefined,
): GateItem[] {
  return (cart?.items ?? []).map((item) => ({
    lineId: item.id,
    title: item.product_title || item.title || "Item",
    metadata: ((item.product as any)?.metadata ??
      (item.variant as any)?.product?.metadata ??
      null) as Record<string, unknown> | null,
  }))
}
