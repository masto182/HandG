"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export type WishlistProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  metadata?: Record<string, any> | null
  first_variant_id: string | null
  total_inventory: number
  cheapest_price: number | null
  currency_code: string
}

export type WishlistEntry = {
  id: string
  product_id: string
  mode: string
  target_price: number | null
  stock_threshold: number
  price_alert_sent: boolean
  admin_approved_offer: boolean
  admin_offer_price: number | null
  admin_offer_expires_at: string | null
  product: WishlistProduct | null
}

export async function getWishlistItems(): Promise<string[]> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) {
    console.warn("[Wishlist] getWishlistItems: no auth token available")
    return []
  }

  try {
    const data = await sdk.client.fetch<{ wishlist: any[] }>(
      "/store/customers/me/wishlist",
      { method: "GET", headers }
    )
    return (data.wishlist || []).map((w: any) => w.product_id)
  } catch (e) {
    console.error("[Wishlist] getWishlistItems error:", e)
    return []
  }
}

export async function getWishlistFull(): Promise<WishlistEntry[]> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return []

  try {
    const data = await sdk.client.fetch<{ wishlist: WishlistEntry[] }>(
      "/store/customers/me/wishlist",
      { method: "GET", headers }
    )
    return data.wishlist || []
  } catch {
    return []
  }
}

export async function addToWishlist(
  productId: string,
  mode?: string,
  targetPrice?: number,
  stockThreshold?: number
): Promise<boolean> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) {
    console.warn("[Wishlist] addToWishlist: no auth token available")
    return false
  }

  try {
    await sdk.client.fetch("/store/customers/me/wishlist", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: {
        product_id: productId,
        mode: mode || "buy_later",
        target_price: targetPrice ?? null,
        stock_threshold: stockThreshold ?? 2,
      },
    })
    return true
  } catch (e) {
    console.error("[Wishlist] addToWishlist error:", e)
    return false
  }
}

export async function updateWishlistItem(
  itemId: string,
  updates: { mode?: string; target_price?: number | null; stock_threshold?: number }
): Promise<boolean> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) {
    console.warn("[Wishlist] updateWishlistItem: no auth token available")
    return false
  }

  try {
    await sdk.client.fetch(`/store/customers/me/wishlist/${itemId}`, {
      method: "PATCH",
      headers: { ...headers, "content-type": "application/json" },
      body: updates,
    })
    return true
  } catch (e) {
    console.error("[Wishlist] updateWishlistItem error:", e)
    return false
  }
}

export async function getWishlistWithProducts(): Promise<WishlistEntry[]> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return []

  try {
    const data = await sdk.client.fetch<{ wishlist: any[] }>(
      "/store/customers/me/wishlist",
      { method: "GET", headers }
    )
    const entries = data.wishlist || []
    return entries.map((e: any) => ({
      id: e.id,
      product_id: e.product_id,
      mode: e.mode || "buy_later",
      target_price: e.target_price ?? null,
      stock_threshold: e.stock_threshold ?? 2,
      price_alert_sent: e.price_alert_sent ?? false,
      admin_approved_offer: e.admin_approved_offer ?? false,
      admin_offer_price: e.admin_offer_price ?? null,
      admin_offer_expires_at: e.admin_offer_expires_at ?? null,
      product: e.product || null,
    }))
  } catch (e) {
    console.error("[Wishlist] getWishlistWithProducts error:", e)
    return []
  }
}

export async function removeFromWishlist(productId: string): Promise<boolean> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) {
    console.warn("[Wishlist] removeFromWishlist: no auth token available")
    return false
  }

  try {
    await sdk.client.fetch("/store/customers/me/wishlist", {
      method: "DELETE",
      headers: { ...headers, "content-type": "application/json" },
      body: { product_id: productId },
    })
    return true
  } catch (e) {
    console.error("[Wishlist] removeFromWishlist error:", e)
    return false
  }
}
