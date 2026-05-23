import "server-only"
import { cache } from "react"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

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

export const getActiveSpecials = cache(
  async (): Promise<ActiveSpecial[]> => {
    try {
      const res = await fetch(`${BACKEND_URL}/store/active-specials`, { // sdk-exempt
        headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
        next: { revalidate: 60 },
      })
      if (!res.ok) return []
      const data = (await res.json()) as { specials: ActiveSpecial[] }
      return data.specials || []
    } catch {
      return []
    }
  }
)

export function getSpecialForProduct(
  specials: ActiveSpecial[],
  productId: string
): ActiveSpecial | null {
  return specials.find((s) => s.target_product_ids.includes(productId)) || null
}
