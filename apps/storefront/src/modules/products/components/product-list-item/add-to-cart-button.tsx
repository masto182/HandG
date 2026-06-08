"use client"

import { useState } from "react"
import { toast } from "sonner"
import { addToCart } from "@lib/data/cart"

export default function AddToCartButton({ variantId }: { variantId: string }) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (adding) return
    setAdding(true)
    setErrorMsg(null)
    try {
      await addToCart({ variantId, quantity: 1, countryCode: "au" })
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
      toast.success("Added to cart")
    } catch (err: any) {
      const msg = err?.message || ""
      if (msg.includes("early-access") || msg.includes("not_yet_available")) {
        setErrorMsg("NOT YET")
        toast.error("Not yet available — check back when early access opens")
      } else if (msg.includes("out of stock") || msg.includes("inventory")) {
        setErrorMsg("SOLD OUT")
        toast.error("Out of stock")
      } else {
        setErrorMsg("ERROR")
        toast.error("Failed to add to cart")
      }
      setTimeout(() => setErrorMsg(null), 3000)
    }
    setAdding(false)
  }

  return (
    <button
      onClick={handleAdd}
      disabled={adding}
      className={`px-5 py-2.5 rounded-sm font-bold text-[13px] uppercase tracking-widest transition-all shadow-sm border disabled:opacity-50 text-nowrap ${errorMsg ? "bg-red-900/30 text-red-300 border-red-500/30" : "bg-hl-surface3 text-hg-text border-hg-border hover:bg-hg-gold hover:text-hg-on-primary"}`}
    >
      {errorMsg ?? (added ? "ADDED" : adding ? "..." : "ADD TO CART")}
    </button>
  )
}
