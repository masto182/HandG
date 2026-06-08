"use server"

import { sdk } from "@lib/config"
import { cache } from "react"

export type BeerDetail = {
  hop_provenance: string | null
  untappd_rating: number | null
}

export const getBeerDetail = cache(
  async (productId: string): Promise<BeerDetail | null> => {
    try {
      const res = await sdk.client.fetch<{ beer_detail: BeerDetail | null }>(
        `/store/products/${productId}/beer-detail`,
        { method: "GET", next: { revalidate: 60 } },
      )
      return res?.beer_detail ?? null
    } catch {
      return null
    }
  },
)
