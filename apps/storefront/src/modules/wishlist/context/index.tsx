"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { getWishlistFull, addToWishlist, removeFromWishlist, updateWishlistItem } from "@lib/data/wishlist"

export type WishlistItemData = {
  id: string
  product_id: string
  mode: string
  target_price: number | null
  stock_threshold: number
}

type WishlistContextType = {
  items: Map<string, WishlistItemData>
  toggle: (productId: string, mode?: string, targetPrice?: number) => Promise<void>
  isWishlisted: (productId: string) => boolean
  getItem: (productId: string) => WishlistItemData | null
  addItem: (productId: string, opts?: { mode?: string; target_price?: number; stock_threshold?: number }) => Promise<boolean>
  removeItem: (productId: string) => Promise<boolean>
  updateItem: (productId: string, updates: { mode?: string; target_price?: number | null; stock_threshold?: number }) => Promise<boolean>
  loading: string | null
}

const WishlistContext = createContext<WishlistContextType>({
  items: new Map(),
  toggle: async () => {},
  isWishlisted: () => false,
  getItem: () => null,
  addItem: async () => false,
  removeItem: async () => false,
  updateItem: async () => false,
  loading: null,
})

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Map<string, WishlistItemData>>(new Map())
  const [loading, setLoading] = useState<string | null>(null)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    getWishlistFull().then((entries) => {
      if (entries.length > 0) {
        const map = new Map<string, WishlistItemData>()
        entries.forEach((e) => {
          map.set(e.product_id, {
            id: e.id,
            product_id: e.product_id,
            mode: e.mode,
            target_price: e.target_price,
            stock_threshold: e.stock_threshold,
          })
        })
        setItems(map)
      }
    })
  }, [])

  const toggle = useCallback(async (productId: string, mode?: string, targetPrice?: number) => {
    setLoading(productId)
    const existing = items.get(productId)

    try {
      if (existing && !mode) {
        const success = await removeFromWishlist(productId)
        if (success) {
          setItems((prev) => {
            const next = new Map(prev)
            next.delete(productId)
            return next
          })
        }
      } else {
        const success = await addToWishlist(productId, mode, targetPrice)
        if (success) {
          setItems((prev) => {
            const next = new Map(prev)
            next.set(productId, {
              id: existing?.id || "",
              product_id: productId,
              mode: mode || "buy_later",
              target_price: targetPrice ?? null,
              stock_threshold: existing?.stock_threshold ?? 2,
            })
            return next
          })
        }
      }
    } catch (e) {
      console.error("[Wishlist] toggle error:", e)
    }

    setLoading(null)
  }, [items])

  const isWishlisted = useCallback((productId: string) => items.has(productId), [items])

  const getItem = useCallback((productId: string) => items.get(productId) || null, [items])

  const addItem = useCallback(async (productId: string, opts?: { mode?: string; target_price?: number; stock_threshold?: number }) => {
    setLoading(productId)
    try {
      const success = await addToWishlist(productId, opts?.mode, opts?.target_price, opts?.stock_threshold)
      if (success) {
        setItems((prev) => {
          const next = new Map(prev)
          next.set(productId, {
            id: "",
            product_id: productId,
            mode: opts?.mode || "buy_later",
            target_price: opts?.target_price ?? null,
            stock_threshold: opts?.stock_threshold ?? 2,
          })
          return next
        })
      }
      setLoading(null)
      return success
    } catch (e) {
      console.error("[Wishlist] addItem error:", e)
      setLoading(null)
      return false
    }
  }, [])

  const removeItem = useCallback(async (productId: string) => {
    setLoading(productId)
    try {
      const success = await removeFromWishlist(productId)
      if (success) {
        setItems((prev) => {
          const next = new Map(prev)
          next.delete(productId)
          return next
        })
      }
      setLoading(null)
      return success
    } catch (e) {
      console.error("[Wishlist] removeItem error:", e)
      setLoading(null)
      return false
    }
  }, [])

  const updateItem = useCallback(async (productId: string, updates: { mode?: string; target_price?: number | null; stock_threshold?: number }) => {
    const existing = items.get(productId)
    if (!existing) return false

    setLoading(productId)
    try {
      const success = await updateWishlistItem(existing.id, updates)
      if (success) {
        setItems((prev) => {
          const next = new Map(prev)
          next.set(productId, {
            ...existing,
            ...updates,
            target_price: updates.target_price !== undefined ? updates.target_price : existing.target_price,
          })
          return next
        })
      }
      setLoading(null)
      return success
    } catch (e) {
      console.error("[Wishlist] updateItem error:", e)
      setLoading(null)
      return false
    }
  }, [items])

  return (
    <WishlistContext.Provider value={{ items, toggle, isWishlisted, getItem, addItem, removeItem, updateItem, loading }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  return useContext(WishlistContext)
}
