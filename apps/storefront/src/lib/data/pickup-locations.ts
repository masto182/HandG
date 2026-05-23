import "server-only"
import { cache } from "react"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export type StockLocationAddress = {
  address_1: string | null
  address_2: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  country_code: string | null
}

export type StockLocationDTO = {
  id: string
  name: string
  address: StockLocationAddress | null
}

export type PickupLocationDTO = {
  id: string
  stock_location_id: string
  slug: string
  hours: Array<{ day: string; open: string; close: string }> | null
  phone: string | null
  notes: string | null
  is_active: boolean
  sort_order: number
  stock_location: StockLocationDTO | null
}

export const getPickupLocations = cache(
  async (): Promise<PickupLocationDTO[]> => {
    try {
      const res = await fetch(`${BACKEND_URL}/store/pickup-locations`, { // sdk-exempt
        headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
        next: { revalidate: 60 },
      })
      if (!res.ok) return []
      const data = (await res.json()) as { locations: PickupLocationDTO[] }
      return data.locations || []
    } catch {
      return []
    }
  }
)
