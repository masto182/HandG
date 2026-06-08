"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

type BreweryFollowDTO = {
  id: string
  customer_id: string
  brewery_id: string
  channel_email: boolean
  channel_inapp: boolean
}

export async function getMyBreweryFollows(): Promise<BreweryFollowDTO[]> {
  try {
    const headers = await getAuthHeaders()
    if (!headers.authorization) return []
    const res = await sdk.client.fetch<{ brewery_follows: BreweryFollowDTO[] }>(
      "/store/customers/me/brewery-follows",
      { method: "GET", headers, next: { revalidate: 0 } },
    )
    return res.brewery_follows ?? []
  } catch {
    return []
  }
}

export async function getMyBreweryFollow(
  breweryId: string,
): Promise<BreweryFollowDTO | null> {
  try {
    const headers = await getAuthHeaders()
    if (!headers.authorization) return null
    const res = await sdk.client.fetch<{ brewery_follows: BreweryFollowDTO[] }>(
      `/store/customers/me/brewery-follows?brewery_id=${encodeURIComponent(breweryId)}`,
      { method: "GET", headers, next: { revalidate: 0 } },
    )
    return res.brewery_follows?.[0] ?? null
  } catch {
    return null
  }
}

export async function followBrewery(breweryId: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders()
    if (!headers.authorization) return false
    await sdk.client.fetch("/store/customers/me/brewery-follows", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: { brewery_id: breweryId },
    })
    return true
  } catch {
    return false
  }
}

export async function unfollowBrewery(breweryId: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders()
    if (!headers.authorization) return false
    await sdk.client.fetch("/store/customers/me/brewery-follows", {
      method: "DELETE",
      headers: { ...headers, "content-type": "application/json" },
      body: { brewery_id: breweryId },
    })
    return true
  } catch {
    return false
  }
}
