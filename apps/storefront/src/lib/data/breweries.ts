"use server"

import { sdk } from "@lib/config"

export async function listBreweries(): Promise<any[]> {
  try {
    const data = await sdk.client.fetch<{ breweries: any[] }>(
      "/store/breweries",
      { method: "GET", next: { revalidate: 60 } }
    )
    return data.breweries || []
  } catch {
    return []
  }
}

export async function getBreweryBySlug(slug: string): Promise<any | null> {
  try {
    const data = await sdk.client.fetch<{ brewery: any }>(
      `/store/breweries/${slug}`,
      { method: "GET", next: { revalidate: 60 } }
    )
    return data.brewery || null
  } catch {
    return null
  }
}
