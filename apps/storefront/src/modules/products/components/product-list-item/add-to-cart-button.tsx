"use client"

import { useState } from "react"
import { toast } from "sonner"
import { addToCart } from "@lib/data/cart"
import { classifyCartError } from "@lib/util/cart-error"
import { useTrack } from "@lib/hooks/use-track"

export default function AddToCartButton({
  variantId,
  productId,
  compact = false,
}: {
  variantId: string
  productId?: string
  compact?: boolean
}) {
  const [adding, setAdding] = useState(false)
  const track = useTrack()
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
      track("cart.item_added", {
        variant_id: variantId,
        ...(productId ? { product_id: productId } : {}),
      })
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
      toast.success("Added to cart")
    } catch (err: any) {
      const kind = classifyCartError(err)
      if (kind === "early_access") {
        setErrorMsg("NOT YET")
        toast.error("Not yet available — check back when early access opens")
      } else if (kind === "out_of_stock") {
        setErrorMsg("SOLD OUT")
        toast.error("Out of stock")
      } else {
        setErrorMsg("ERROR")
        toast.error("Couldn't add to cart. Please try again.")
      }
      setTimeout(() => setErrorMsg(null), 3000)
    }
    setAdding(false)
  }

  return (
    <button
      onClick={handleAdd}
      disabled={adding}
      className={`${compact ? "px-3 py-2 text-[11px] tracking-wider" : "px-5 py-2.5 text-[13px] tracking-widest"} rounded-sm font-bold uppercase transition-all shadow-sm border disabled:opacity-50 text-nowrap ${errorMsg ? "bg-red-900/30 text-red-300 border-red-500/30" : "bg-hl-surface3 text-hg-text border-hg-border hover:bg-hg-gold hover:text-hg-on-primary"}`}
    >
      {compact
        ? (errorMsg ?? (added ? "Added" : adding ? "..." : "Add"))
        : (errorMsg ?? (added ? "ADDED" : adding ? "..." : "ADD TO CART"))}
    </button>
  )
}
