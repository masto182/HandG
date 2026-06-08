"use server"

import { sdk } from "@lib/config"

export type Hop = {
  id: string
  name: string
  slug: string
  origin: string | null
  country_code: string | null
  breeder: string | null
  available_forms: string[] | null
  farm_notes: string | null
  flavor_profile: string | null
  description: string | null
  image_url: string | null
  product_count: number
}

export async function listHops(): Promise<Hop[]> {
  try {
    const data = await sdk.client.fetch<{ hops: Hop[] }>("/store/hops", {
      method: "GET",
      next: { revalidate: 60 },
    })
    return data.hops || []
  } catch {
    return []
  }
}

export async function getHopBySlug(
  slug: string,
): Promise<{ hop: Hop; products: any[] } | null> {
  try {
    const data = await sdk.client.fetch<{ hop: Hop; products: any[] }>(
      `/store/hops/${slug}`,
      { method: "GET", next: { revalidate: 120 } },
    )
    if (!data?.hop) return null
    return { hop: data.hop, products: data.products || [] }
  } catch {
    return null
  }
}
