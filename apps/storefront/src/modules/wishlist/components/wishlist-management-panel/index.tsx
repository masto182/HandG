"use client"

import { useState, useEffect, useCallback } from "react"
import { useWishlist } from "@modules/wishlist/context"

type WishlistManagementPanelProps = {
  productId: string
}

export default function WishlistManagementPanel({ productId }: WishlistManagementPanelProps) {
  const { isWishlisted, getItem, addItem, removeItem, updateItem, loading } = useWishlist()
  const isLoading = loading === productId
  const wishlisted = isWishlisted(productId)
  const item = getItem(productId)

  const [expanded, setExpanded] = useState(true)
  const [savedToWishlist, setSavedToWishlist] = useState(false)
  const [lowStockAlert, setLowStockAlert] = useState(false)
  const [stockThreshold, setStockThreshold] = useState("2")
  const [targetPrice, setTargetPrice] = useState("")

  useEffect(() => {
    if (item) {
      setSavedToWishlist(true)
      setLowStockAlert((item.stock_threshold ?? 0) > 0)
      setStockThreshold(String(item.stock_threshold || 2))
      if (item.target_price) {
        setTargetPrice(String(item.target_price))
      }
    } else {
      setSavedToWishlist(false)
      setLowStockAlert(false)
      setStockThreshold("2")
      setTargetPrice("")
    }
  }, [item])

  const handleWishlistToggle = useCallback(async () => {
    if (savedToWishlist) {
      await removeItem(productId)
    } else {
      await addItem(productId, { mode: "buy_later" })
    }
  }, [savedToWishlist, productId, addItem, removeItem])

  const handleLowStockToggle = useCallback(async () => {
    const newValue = !lowStockAlert
    setLowStockAlert(newValue)

    if (!wishlisted) {
      await addItem(productId, {
        mode: "buy_later",
        stock_threshold: newValue ? parseInt(stockThreshold) || 2 : 0,
      })
    } else {
      await updateItem(productId, {
        stock_threshold: newValue ? parseInt(stockThreshold) || 2 : 0,
      })
    }
  }, [lowStockAlert, wishlisted, productId, stockThreshold, addItem, updateItem])

  const handleStockThresholdSet = useCallback(async () => {
    const val = parseInt(stockThreshold) || 2
    if (!wishlisted) {
      await addItem(productId, { mode: "buy_later", stock_threshold: val })
    } else {
      await updateItem(productId, { stock_threshold: val })
    }
  }, [stockThreshold, wishlisted, productId, addItem, updateItem])

  const handleTargetPriceSet = useCallback(async () => {
    const price = parseFloat(targetPrice)
    if (!price || price <= 0) return

    if (!wishlisted) {
      await addItem(productId, { mode: "buy_at_price", target_price: price })
    } else {
      await updateItem(productId, { mode: "buy_at_price", target_price: price })
    }
  }, [targetPrice, wishlisted, productId, addItem, updateItem])

  return (
    <div className="bg-hg-surface rounded-xl border border-hg-border/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-3 bg-hg-surface-dim border-b border-hg-border/20 flex items-center justify-between lg:cursor-default"
      >
        <h3 className="font-semibold text-[12px] text-hl-primary uppercase tracking-[0.05em]">
          Wishlist Management
        </h3>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-hg-text-secondary transition-transform duration-200 lg:hidden ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0 lg:max-h-[400px] lg:opacity-100"
        }`}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-hg-text font-semibold uppercase tracking-tight">
                Save to Wishlist
              </span>
              <span className="text-[11px] text-hg-text-secondary">
                Keep track of this drop
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={savedToWishlist}
                onChange={handleWishlistToggle}
                disabled={isLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-hg-surface-dim peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-hl-primary" />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-hg-text font-semibold uppercase tracking-tight">
                Low Stock Alert
              </span>
              <span className="text-[11px] text-hg-text-secondary">
                Notify when stock is running low
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockAlert}
                onChange={handleLowStockToggle}
                disabled={isLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-hg-surface-dim peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-hl-primary" />
            </label>
          </div>

          {lowStockAlert && (
            <div className="pl-0 flex items-center gap-2">
              <span className="text-[11px] text-hg-text-secondary">Alert below</span>
              <input
                type="number"
                min="1"
                max="50"
                value={stockThreshold}
                onChange={(e) => setStockThreshold(e.target.value)}
                className="w-16 bg-hg-bg border border-hg-border/30 rounded-lg py-1.5 px-3 text-sm text-hl-primary font-bold text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-[11px] text-hg-text-secondary">units</span>
              <button
                type="button"
                onClick={handleStockThresholdSet}
                disabled={isLoading}
                className="bg-hl-primary text-white px-3 py-1.5 rounded-lg font-semibold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
              >
                Set
              </button>
            </div>
          )}

          <div className="pt-2">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-hg-text font-semibold uppercase tracking-tight">
                Alert me at price point
              </span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-hl-primary font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="15.00"
                    className="w-full bg-hg-bg border border-hg-border/30 rounded-lg py-2 pl-8 pr-4 text-hl-primary font-bold placeholder:text-hl-primary/20 focus:ring-1 focus:ring-hl-primary focus:border-hl-primary transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTargetPriceSet}
                  disabled={isLoading || !targetPrice}
                  className="bg-hl-primary text-white px-4 py-2 rounded-lg font-semibold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
                >
                  Set
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
