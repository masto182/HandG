"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { getLikedProducts, toggleProductLike } from "@lib/data/likes"

type LikesContextType = {
  items: Set<string>
  counts: Map<string, number>
  toggle: (productId: string) => Promise<void>
  isLiked: (productId: string) => boolean
  getCount: (productId: string) => number
  setCount: (productId: string, count: number) => void
  loading: string | null
}

const LikesContext = createContext<LikesContextType>({
  items: new Set(),
  counts: new Map(),
  toggle: async () => {},
  isLiked: () => false,
  getCount: () => 0,
  setCount: () => {},
  loading: null,
})

export function LikesProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Set<string>>(new Set())
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState<string | null>(null)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    getLikedProducts().then((ids) => {
      if (ids.length > 0) {
        setItems(new Set(ids))
      }
    })
  }, [])

  const toggle = useCallback(async (productId: string) => {
    setLoading(productId)
    const result = await toggleProductLike(productId)

    if (result.liked_by_me) {
      setItems((prev) => {
        const next = new Set(prev)
        next.add(productId)
        return next
      })
    } else {
      setItems((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }

    setCounts((prev) => {
      const next = new Map(prev)
      next.set(productId, result.count)
      return next
    })

    setLoading(null)
  }, [])

  const isLiked = useCallback((productId: string) => items.has(productId), [items])

  const getCount = useCallback((productId: string) => counts.get(productId) || 0, [counts])

  const setCount = useCallback((productId: string, count: number) => {
    setCounts((prev) => {
      const next = new Map(prev)
      next.set(productId, count)
      return next
    })
  }, [])

  return (
    <LikesContext.Provider value={{ items, counts, toggle, isLiked, getCount, setCount, loading }}>
      {children}
    </LikesContext.Provider>
  )
}

export function useLikes() {
  return useContext(LikesContext)
}
