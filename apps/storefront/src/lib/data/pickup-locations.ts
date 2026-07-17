import "server-only"
import { cache } from "react"
import { sdk } from "@lib/config"

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
      const data = await sdk.client.fetch<{ locations: PickupLocationDTO[] }>(
        "/store/pickup-locations",
        { next: { revalidate: 60 } },
      )
      return data.locations || []
    } catch {
      return []
    }
  },
)
