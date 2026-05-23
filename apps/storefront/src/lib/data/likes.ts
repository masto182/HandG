"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export async function getLikedProducts(): Promise<string[]> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return []

  try {
    const data = await sdk.client.fetch<{ likes: string[] }>(
      "/store/customers/me/likes",
      { method: "GET", headers }
    )
    return data.likes || []
  } catch {
    return []
  }
}

export async function toggleProductLike(productId: string): Promise<{ count: number; liked_by_me: boolean }> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return { count: 0, liked_by_me: false }

  try {
    const data = await sdk.client.fetch<{ count: number; liked_by_me: boolean }>(
      `/store/products/${productId}/likes`,
      { method: "POST", headers }
    )
    return data
  } catch {
    return { count: 0, liked_by_me: false }
  }
}

export async function getProductLikeCount(productId: string): Promise<{ count: number; liked_by_me: boolean }> {
  try {
    const headers = await getAuthHeaders()
    const data = await sdk.client.fetch<{ count: number; liked_by_me: boolean }>(
      `/store/products/${productId}/likes`,
      { method: "GET", headers: headers.authorization ? headers : undefined }
    )
    return data
  } catch {
    return { count: 0, liked_by_me: false }
  }
}
