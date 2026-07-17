import "server-only"
import { cache } from "react"
import { sdk } from "@lib/config"

export type ActiveSpecial = {
  id: string
  title: string
  description: string | null
  type: "flash_sale" | "vip_exclusive" | "aging_markdown"
  starts_at: string
  ends_at: string | null
  target_product_ids: string[]
  target_customer_groups: string[]
  discount_type: "percentage" | "fixed"
  discount_value: number
}

export const getActiveSpecials = cache(async (): Promise<ActiveSpecial[]> => {
  try {
    const data = await sdk.client.fetch<{ specials: ActiveSpecial[] }>(
      "/store/active-specials",
      { next: { revalidate: 60 } },
    )
    return data.specials || []
  } catch {
    return []
  }
})

export function getSpecialForProduct(
  specials: ActiveSpecial[],
  productId: string,
): ActiveSpecial | null {
  return specials.find((s) => s.target_product_ids.includes(productId)) || null
}
