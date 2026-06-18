"use client"

import { useState, useEffect, useCallback } from "react"
import { useWishlist } from "@modules/wishlist/context"

type WishlistManagementPanelProps = {
  productId: string
}

type FeedbackState = "idle" | "saving" | "saved"

export default function WishlistManagementPanel({
  productId,
}: WishlistManagementPanelProps) {
  const { isWishlisted, getItem, addItem, removeItem, updateItem, loading } =
    useWishlist()
  const isLoading = loading === productId
  const wishlisted = isWishlisted(productId)
  const item = getItem(productId)

  const [savedToWishlist, setSavedToWishlist] = useState(false)
  const [lowStockAlert, setLowStockAlert] = useState(false)
  const [priceAlert, setPriceAlert] = useState(false)
  const [stockThreshold, setStockThreshold] = useState("2")
  const [targetPrice, setTargetPrice] = useState("")
  const [stockFeedback, setStockFeedback] = useState<FeedbackState>("idle")
  const [priceFeedback, setPriceFeedback] = useState<FeedbackState>("idle")

  useEffect(() => {
    if (item) {
      setSavedToWishlist(true)
      setStockThreshold(String(item.stock_threshold || 2))
      // Only ever turn the alert toggles ON from saved server state — never OFF
      // based on the item merely existing. The item is (re)emitted after every
      // wishlist write, including the one the toggle itself triggers; turning a
      // toggle OFF here would collapse a section the user just opened (e.g. a
      // freshly-created item that has no target_price yet).
      if (item.target_price) {
        setTargetPrice(String(item.target_price))
        setPriceAlert(true)
      }
      if ((item.stock_threshold ?? 0) > 0) {
        setLowStockAlert(true)
      }
    } else {
      setSavedToWishlist(false)
      setLowStockAlert(false)
      setPriceAlert(false)
      setStockThreshold("2")
      setTargetPrice("")
    }
  }, [item])

  const ensureWishlisted = useCallback(
    async (opts?: {
      stock_threshold?: number
      target_price?: number | null
      mode?: string
    }) => {
      if (!wishlisted) {
        const { target_price, ...rest } = opts || {}
        return await addItem(productId, {
          mode: "buy_later",
          ...rest,
          ...(target_price != null ? { target_price } : {}),
        })
      }
      if (opts) {
        return await updateItem(productId, opts)
      }
      return true
    },
    [wishlisted, productId, addItem, updateItem],
  )

  const handleSavedToggle = useCallback(async () => {
    if (savedToWishlist) {
      setSavedToWishlist(false)
      setLowStockAlert(false)
      setPriceAlert(false)
      await removeItem(productId)
    } else {
      setSavedToWishlist(true)
      await ensureWishlisted()
    }
  }, [savedToWishlist, productId, ensureWishlisted, removeItem])

  const handleStockToggle = useCallback(async () => {
    if (lowStockAlert) {
      setLowStockAlert(false)
      if (wishlisted) {
        await updateItem(productId, { stock_threshold: 0 })
      }
    } else {
      setLowStockAlert(true)
      setSavedToWishlist(true)
      await ensureWishlisted({ stock_threshold: parseInt(stockThreshold) || 2 })
    }
  }, [
    lowStockAlert,
    wishlisted,
    stockThreshold,
    productId,
    ensureWishlisted,
    updateItem,
  ])

  const handlePriceToggle = useCallback(async () => {
    if (priceAlert) {
      setPriceAlert(false)
      if (wishlisted) {
        await updateItem(productId, { target_price: null })
      }
    } else {
      setPriceAlert(true)
      setSavedToWishlist(true)
      const price = parseFloat(targetPrice)
      if (price > 0) {
        await ensureWishlisted({ target_price: price, mode: "buy_at_price" })
      } else {
        await ensureWishlisted()
      }
    }
  }, [
    priceAlert,
    wishlisted,
    targetPrice,
    productId,
    ensureWishlisted,
    updateItem,
  ])

  const handleStockSet = useCallback(async () => {
    const val = parseInt(stockThreshold) || 2
    setStockFeedback("saving")
    const success = await ensureWishlisted({ stock_threshold: val })
    if (success) {
      setStockFeedback("saved")
      setTimeout(() => setStockFeedback("idle"), 2000)
    } else {
      setStockFeedback("idle")
    }
  }, [stockThreshold, ensureWishlisted])

  const handlePriceSet = useCallback(async () => {
    const price = parseFloat(targetPrice)
    if (!price || price <= 0) return
    setPriceFeedback("saving")
    const success = await ensureWishlisted({
      target_price: price,
      mode: "buy_at_price",
    })
    if (success) {
      setPriceFeedback("saved")
      setTimeout(() => setPriceFeedback("idle"), 2000)
    } else {
      setPriceFeedback("idle")
    }
  }, [targetPrice, ensureWishlisted])

  const Checkbox = ({
    checked,
    onChange,
    disabled,
  }: {
    checked: boolean
    onChange: () => void
    disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        // Stop propagation so the click does not ALSO trigger the wrapping
        // label's onClick, which would double-toggle and cancel the change.
        e.stopPropagation()
        onChange()
      }}
      disabled={disabled}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? "bg-hl-primary border-hl-primary" : "bg-transparent border-hg-border hover:border-hg-gold/50"} ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      {checked && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  )

  const SetButton = ({
    onClick,
    feedback,
    disabled,
  }: {
    onClick: () => void
    feedback: FeedbackState
    disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || feedback === "saving"}
      className={`px-4 py-1.5 rounded-lg font-semibold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 ${feedback === "saved" ? "bg-transparent text-hl-primary border border-hl-primary" : "bg-hl-primary text-white hover:opacity-90"}`}
    >
      {feedback === "saving" ? "..." : feedback === "saved" ? "SAVED" : "SET"}
    </button>
  )

  return (
    <div className="bg-hg-surface rounded-xl border border-hg-border/30 overflow-hidden">
      <div className="px-6 py-3 bg-hg-surface-dim border-b border-hg-border/20">
        <h3 className="font-semibold text-[12px] text-hl-primary uppercase tracking-[0.05em]">
          Wishlist Management
        </h3>
      </div>

      <div className="p-6 space-y-5">
        <div className="space-y-1">
          <label
            className="flex items-center gap-3 cursor-pointer"
            onClick={handleSavedToggle}
          >
            <Checkbox
              checked={savedToWishlist}
              onChange={handleSavedToggle}
              disabled={isLoading}
            />
            <span className="text-sm text-hg-text font-semibold">
              Save to Wishlist
            </span>
          </label>
        </div>

        <div className="space-y-2">
          <label
            className="flex items-center gap-3 cursor-pointer"
            onClick={handleStockToggle}
          >
            {/* Checkbox button calls onChange and stops propagation; the label
                onClick handles clicks on the text. Single toggle either way. */}
            <Checkbox
              checked={lowStockAlert}
              onChange={handleStockToggle}
              disabled={isLoading}
            />
            <span className="text-sm text-hg-text font-semibold">
              Low Stock Alert
            </span>
          </label>
          {lowStockAlert && (
            <div className="pl-8 flex items-center gap-2 pt-1">
              <span className="text-[11px] text-hg-text-secondary">
                Alert below
              </span>
              <input
                type="number"
                min="1"
                max="50"
                value={stockThreshold}
                onChange={(e) => setStockThreshold(e.target.value)}
                className="w-14 bg-hg-bg border border-hg-border/30 rounded-lg py-1.5 px-2 text-sm text-hl-primary font-bold text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-[11px] text-hg-text-secondary">units</span>
              <SetButton
                onClick={handleStockSet}
                feedback={stockFeedback}
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label
            className="flex items-center gap-3 cursor-pointer"
            onClick={handlePriceToggle}
          >
            {/* Checkbox button calls onChange and stops propagation; the label
                onClick handles clicks on the text. Single toggle either way. */}
            <Checkbox
              checked={priceAlert}
              onChange={handlePriceToggle}
              disabled={isLoading}
            />
            <span className="text-sm text-hg-text font-semibold">
              Alert me at Price
            </span>
          </label>
          {priceAlert && (
            <div className="pl-8 flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hl-primary font-bold text-sm">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="15.00"
                  className="w-full bg-hg-bg border border-hg-border/30 rounded-lg py-1.5 pl-7 pr-3 text-sm text-hl-primary font-bold placeholder:text-hl-primary/20 focus:ring-1 focus:ring-hl-primary focus:border-hl-primary transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <SetButton
                onClick={handlePriceSet}
                feedback={priceFeedback}
                disabled={isLoading || !targetPrice}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
