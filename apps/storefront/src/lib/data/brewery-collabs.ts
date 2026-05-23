import "server-only"
import { sdk } from "@lib/config"

export type CollabProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  metadata: any
  created_at: string
  primary_brewery_name: string
}

export async function getBreweryCollabs(slug: string): Promise<CollabProduct[]> {
  try {
    const data = await sdk.client.fetch<{ collabs: CollabProduct[] }>(
      `/store/breweries/${slug}/collabs`,
      { method: "GET", next: { revalidate: 60 } }
    )
    return data.collabs || []
  } catch {
    return []
  }
}
