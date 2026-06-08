"use server"

import { sdk } from "@lib/config"

export async function listBreweries(): Promise<any[]> {
  try {
    const data = await sdk.client.fetch<{ breweries: any[] }>(
      "/store/breweries",
      { method: "GET", next: { revalidate: 60 } },
    )
    return data.breweries || []
  } catch {
    return []
  }
}

export async function getBreweryBySlug(
  slug: string,
): Promise<{ brewery: any; product_ids: string[] } | null> {
  try {
    const data = await sdk.client.fetch<{
      brewery: any
      product_ids: string[]
    }>(`/store/breweries/${slug}`, { method: "GET", next: { revalidate: 60 } })
    if (!data.brewery) return null
    return { brewery: data.brewery, product_ids: data.product_ids || [] }
  } catch {
    return null
  }
}
