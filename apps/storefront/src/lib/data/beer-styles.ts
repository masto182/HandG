"use server"

import { sdk } from "@lib/config"

export type BeerStyle = {
  id: string
  name: string
  slug: string
  family: string
  description?: string | null
  color_hex?: string | null
}

export async function getProductBeerStyle(
  productId: string,
): Promise<BeerStyle | null> {
  try {
    const data = await sdk.client.fetch<{ beer_style: BeerStyle | null }>(
      `/store/products/${productId}/beer-style`,
      { method: "GET", next: { revalidate: 60 } },
    )
    return data.beer_style || null
  } catch {
    return null
  }
}
