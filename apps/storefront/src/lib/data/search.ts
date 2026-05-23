"use server"

import { sdk } from "@lib/config"

export async function searchProducts(
  query: string,
  filters?: Record<string, string>,
  limit?: number
): Promise<any> {
  try {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (limit) params.set("limit", String(limit))
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, value)
      }
    }

    const data = await sdk.client.fetch<any>(
      `/store/search?${params.toString()}`,
      { method: "GET" }
    )
    return data
  } catch {
    return { hits: [], totalHits: 0 }
  }
}
