"use client"

import { useState } from "react"
import { addToCart } from "@lib/data/cart"

export default function AddToCartButton({ variantId }: { variantId: string }) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState(false)

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (adding) return
    setAdding(true)
    setError(false)
    try {
      await addToCart({ variantId, quantity: 1, countryCode: "au" })
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
    } catch {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
    setAdding(false)
  }

  return (
    <button
      onClick={handleAdd}
      disabled={adding}
      className="bg-hl-surface3 text-hg-text px-5 py-2.5 rounded-sm font-bold text-[13px] uppercase tracking-widest hover:bg-hg-gold hover:text-hg-on-primary transition-all shadow-sm border border-hg-border disabled:opacity-50 text-nowrap"
    >
      {error ? "ERROR" : added ? "ADDED ✓" : adding ? "..." : "ADD TO CART"}
    </button>
  )
}
