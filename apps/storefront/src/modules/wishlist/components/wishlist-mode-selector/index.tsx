"use client"

import { useState } from "react"
import { useWishlist } from "@modules/wishlist/context"

type WishlistModeSelectorProps = {
  productId: string
  currentPrice?: number
}

export default function WishlistModeSelector({ productId, currentPrice }: WishlistModeSelectorProps) {
  const { isWishlisted, toggle, loading } = useWishlist()
  const wishlisted = isWishlisted(productId)
  const isLoading = loading === productId
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<string>("buy_later")
  const [targetPrice, setTargetPrice] = useState<string>("")

  const handleSave = async () => {
    const priceValue = mode === "buy_at_price" && targetPrice ? parseFloat(targetPrice) : undefined
    await toggle(productId, mode, priceValue)
    setOpen(false)
  }

  const handleRemove = async () => {
    if (wishlisted) {
      await toggle(productId)
      setOpen(false)
    }
  }

  if (wishlisted && !open) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded border border-hg-gold bg-hg-gold/10 text-hg-gold text-sm transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          Saved
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 rounded border border-hg-border text-hg-text-secondary hover:border-hg-gold/50 hover:text-hg-gold text-sm transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        Save
      </button>
    )
  }

  return (
    <div className="relative">
      <div className="p-4 bg-hg-surface border border-hg-border rounded-lg shadow-md w-[280px]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-hg-text">Add to Wishlist</h4>
          <button onClick={() => setOpen(false)} className="text-hg-text-secondary hover:text-hg-text p-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3 p-2 rounded hover:bg-hg-bg cursor-pointer transition-colors">
            <input
              type="radio"
              name="wishlist-mode"
              value="buy_later"
              checked={mode === "buy_later"}
              onChange={() => setMode("buy_later")}
              className="accent-hg-gold"
            />
            <div>
              <p className="text-sm text-hg-text">Buy Later</p>
              <p className="text-[11px] text-hg-text-secondary">Save for when you're ready</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-2 rounded hover:bg-hg-bg cursor-pointer transition-colors">
            <input
              type="radio"
              name="wishlist-mode"
              value="low_stock_alert"
              checked={mode === "low_stock_alert"}
              onChange={() => setMode("low_stock_alert")}
              className="accent-hg-gold"
            />
            <div>
              <p className="text-sm text-hg-text">Low Stock Alert</p>
              <p className="text-[11px] text-hg-text-secondary">Notify me at 2 or fewer left</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-2 rounded hover:bg-hg-bg cursor-pointer transition-colors">
            <input
              type="radio"
              name="wishlist-mode"
              value="buy_at_price"
              checked={mode === "buy_at_price"}
              onChange={() => setMode("buy_at_price")}
              className="accent-hg-gold"
            />
            <div>
              <p className="text-sm text-hg-text">Buy at Price</p>
              <p className="text-[11px] text-hg-text-secondary">Alert me at my target price</p>
            </div>
          </label>

          {mode === "buy_at_price" && (
            <div className="pl-8 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-hg-text-secondary">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder={currentPrice ? currentPrice.toFixed(2) : "0.00"}
                  className="w-24 px-3 py-1.5 bg-hg-bg border border-hg-border rounded text-sm text-hg-text placeholder:text-hg-text-muted [appearance:textfield]"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={isLoading || (mode === "buy_at_price" && !targetPrice)}
            className="btn-primary text-xs !min-h-[36px] flex-1 disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
          {wishlisted && (
            <button
              onClick={handleRemove}
              className="px-3 py-1.5 text-xs border border-hg-border rounded text-hg-text-secondary hover:text-red-400 hover:border-red-400/50 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
