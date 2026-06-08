"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  getWishlistWithProducts,
  removeFromWishlist,
  updateWishlistItem,
  WishlistEntry,
} from "@lib/data/wishlist"
import { addToCart } from "@lib/data/cart"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Tab = "all" | "watching" | "low_stock" | "price" | "restock"

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "watching", label: "Watching" },
  { key: "low_stock", label: "Low Stock" },
  { key: "price", label: "Price" },
  { key: "restock", label: "Restock" },
]

function formatPrice(amount: number | null, currency: string = "aud"): string {
  if (amount == null) return "\u2014"
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount)
}

function WishlistCard({
  item,
  onRemove,
  onUpdatePrice,
  onUpdateThreshold,
  onClearStockAlert,
  onClearPriceAlert,
  onSetStockAlert,
  onSetPriceAlert,
  onAddToCart,
  addingToCart,
}: {
  item: WishlistEntry
  onRemove: () => void
  onUpdatePrice: (price: number) => void
  onUpdateThreshold: (threshold: number) => void
  onClearStockAlert: () => void
  onClearPriceAlert: () => void
  onSetStockAlert: (threshold: number) => void
  onSetPriceAlert: (price: number) => void
  onAddToCart: () => void
  addingToCart: boolean
}) {
  const product = item.product
  const inventory = product?.total_inventory ?? 0
  const currentPrice = product?.cheapest_price ?? null
  const isOOS = inventory === 0
  const hasStock = (item.stock_threshold ?? 0) > 0
  const hasPrice = item.target_price != null
  const priceMet =
    hasPrice && currentPrice != null && currentPrice <= item.target_price!
  const stockMet =
    hasStock && inventory > 0 && inventory <= item.stock_threshold

  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState(
    item.target_price ? item.target_price.toFixed(2) : "",
  )
  const [editingStock, setEditingStock] = useState(false)
  const [addingPrice, setAddingPrice] = useState(false)
  const [addingStock, setAddingStock] = useState(false)
  const [newPriceInput, setNewPriceInput] = useState("")
  const [newStockInput, setNewStockInput] = useState("3")

  const handleSavePrice = () => {
    const val = parseFloat(priceInput)
    if (!isNaN(val) && val > 0) {
      onUpdatePrice(val)
      setEditingPrice(false)
    }
  }

  const handleNewPrice = () => {
    const val = parseFloat(newPriceInput)
    if (!isNaN(val) && val > 0) {
      onSetPriceAlert(val)
      setAddingPrice(false)
      setNewPriceInput("")
    }
  }

  const handleNewStock = () => {
    const val = parseInt(newStockInput)
    if (!isNaN(val) && val > 0) {
      onSetStockAlert(val)
      setAddingStock(false)
    }
  }

  const bannerText = stockMet
    ? "LOW STOCK ALERT MET"
    : priceMet
      ? "TARGET PRICE MET"
      : null
  const borderClass = stockMet
    ? "border-2 border-[#ffb3b4]"
    : priceMet
      ? "border-2 border-[#b6d247]"
      : isOOS
        ? "border border-dashed border-[#3f4943]/50"
        : "border border-[#3f4943]/30"

  return (
    <div
      className={`bg-[#171E1B] ${borderClass} rounded-xl overflow-clip group flex flex-col h-[620px] relative ${isOOS ? "opacity-90" : ""}`}
    >
      {bannerText && (
        <div
          className={`absolute left-0 w-full text-center font-semibold text-[12px] uppercase tracking-widest leading-none z-10 h-7 flex items-center justify-center -top-[1px] ${stockMet ? "bg-[#ffb3b4] text-[#571d21]" : "bg-[#b6d247] text-[#2a3400]"}`}
        >
          {bannerText}
        </div>
      )}

      <div
        className={`relative aspect-square bg-[#323633] overflow-hidden ${isOOS ? "grayscale-[40%]" : ""}`}
      >
        {product?.thumbnail ? (
          <LocalizedClientLink href={`/products/${product.handle}`}>
            <img
              src={product.thumbnail}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </LocalizedClientLink>
        ) : (
          <LocalizedClientLink
            href={product?.handle ? `/products/${product.handle}` : "#"}
            className="w-full h-full flex items-center justify-center"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-[#89938c]"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </LocalizedClientLink>
        )}
        <button
          onClick={onRemove}
          className="absolute top-4 right-4 bg-[#101412]/60 backdrop-blur-md p-1.5 rounded-full text-[#bfc9c1] hover:text-[#e0e3df] transition-colors"
          aria-label="Remove"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {isOOS && (
          <div className="absolute inset-0 bg-[#101412]/40 flex items-center justify-center">
            <span className="bg-[#101412]/80 backdrop-blur-md text-[#e0e3df] px-6 py-1.5 rounded-full font-semibold text-[10px] uppercase tracking-wider border border-[#3f4943]/30">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-6 pt-4 flex flex-col flex-grow">
        <span className="text-[#bfc9c1] font-semibold text-[12px] uppercase tracking-[0.05em] leading-none mb-1">
          {(product?.metadata as any)?.brewery_name || ""}
        </span>
        <h3 className="text-[24px] font-semibold text-[#e0e3df] tracking-[-0.01em] leading-[1.3] line-clamp-2 mb-4">
          <LocalizedClientLink
            href={product?.handle ? `/products/${product.handle}` : "#"}
            className="hover:text-[#8ed5b1] transition-colors"
          >
            {product?.title || "Unknown Product"}
          </LocalizedClientLink>
        </h3>

        <div className="mt-auto space-y-4">
          <div className="border-t border-[#3f4943]/20 pt-4 grid grid-cols-1 gap-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[#bfc9c1] text-[12px] font-semibold uppercase tracking-[0.05em] leading-none mb-1">
                  {isOOS ? "Last Price" : "Current Price"}
                </p>
                <p
                  className={`text-[20px] font-bold leading-none ${priceMet ? "text-[#b6d247]" : isOOS ? "text-[#89938c]" : "text-[#8FD0B0]"}`}
                >
                  {currentPrice != null
                    ? formatPrice(currentPrice, product?.currency_code)
                    : "\u2014"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#bfc9c1] text-[12px] font-semibold uppercase tracking-[0.05em] leading-none mb-1">
                  Current Stock
                </p>
                <p
                  className={`text-[20px] font-bold leading-none ${isOOS ? "text-[#ffb4ab]" : stockMet ? "text-[#ffb3b4]" : inventory <= 5 ? "text-[#ffb3b4]" : "text-[#8FD0B0]"}`}
                >
                  {isOOS ? "OUT OF STOCK" : inventory}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 h-16">
              {hasPrice ? (
                <div
                  className={`p-2 rounded flex flex-col justify-between ${priceMet ? "bg-[#b6d247]/10 border border-[#b6d247]" : "bg-[#1d201e]/50 border border-[#b6d247]/30"}`}
                >
                  <p className="text-[#bfc9c1] text-[10px] font-bold uppercase">
                    Price Alert
                  </p>
                  {editingPrice ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#bfc9c1]">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={priceInput}
                        onChange={(e) =>
                          setPriceInput(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSavePrice()
                          if (e.key === "Escape") setEditingPrice(false)
                        }}
                        autoFocus
                        className="w-12 px-1 py-0.5 bg-[#101412] border border-[#3f4943] rounded text-[11px] text-[#e0e3df] text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={handleSavePrice}
                        className="text-[9px] font-bold text-[#8ed5b1]"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[#b6d247] font-bold text-sm leading-none">
                        {priceMet
                          ? `MET AT ${formatPrice(item.target_price, product?.currency_code)}`
                          : formatPrice(
                              item.target_price,
                              product?.currency_code,
                            )}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setPriceInput(item.target_price?.toFixed(2) || "")
                            setEditingPrice(true)
                          }}
                          className="text-[#bfc9c1] hover:text-[#8ed5b1] transition-colors"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={onClearPriceAlert}
                          className="text-[#bfc9c1] hover:text-[#ffb4ab] transition-colors"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : addingPrice ? (
                <div className="p-2 rounded border border-[#b6d247]/30 bg-[#1d201e]/50 flex flex-col justify-between">
                  <p className="text-[#bfc9c1] text-[10px] font-bold uppercase">
                    Set Price
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[#bfc9c1]">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newPriceInput}
                      onChange={(e) =>
                        setNewPriceInput(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleNewPrice()
                        if (e.key === "Escape") setAddingPrice(false)
                      }}
                      autoFocus
                      placeholder="40"
                      className="w-12 px-1 py-0.5 bg-[#101412] border border-[#3f4943] rounded text-[11px] text-[#e0e3df] text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none placeholder:text-[#89938c]/30"
                    />
                    <button
                      onClick={handleNewPrice}
                      className="text-[9px] font-bold text-[#8ed5b1]"
                    >
                      SET
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingPrice(true)}
                  className="p-2 rounded border border-dashed border-[#3f4943] hover:bg-[#363a37]/5 flex flex-col items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-[#89938c] uppercase">
                    + Price
                  </span>
                </button>
              )}

              {hasStock ? (
                <div
                  className={`p-2 rounded flex flex-col justify-between ${stockMet ? "bg-[#ffb3b4]/10 border border-[#ffb3b4]" : "bg-[#1d201e]/50 border border-[#ffb3b4]/30"}`}
                >
                  <p className="text-[#bfc9c1] text-[10px] font-bold uppercase">
                    Stock Alert
                  </p>
                  {editingStock ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={item.stock_threshold}
                        onChange={(e) => {
                          onUpdateThreshold(parseInt(e.target.value))
                          setEditingStock(false)
                        }}
                        autoFocus
                        className="bg-[#101412] border border-[#3f4943] rounded px-1 py-0.5 text-[11px] text-[#e0e3df] flex-1"
                      >
                        {[1, 2, 3, 4, 5, 10, 15, 20].map((n) => (
                          <option key={n} value={n}>
                            {n} left
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[#ffb3b4] font-bold text-sm leading-none">
                        {stockMet
                          ? `MET AT ${item.stock_threshold}`
                          : `${item.stock_threshold} LEFT`}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingStock(true)}
                          className="text-[#bfc9c1] hover:text-[#8ed5b1] transition-colors"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={onClearStockAlert}
                          className="text-[#bfc9c1] hover:text-[#ffb4ab] transition-colors"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : addingStock ? (
                <div className="p-2 rounded border border-[#ffb3b4]/30 bg-[#1d201e]/50 flex flex-col justify-between">
                  <p className="text-[#bfc9c1] text-[10px] font-bold uppercase">
                    Alert At
                  </p>
                  <div className="flex items-center gap-1">
                    <select
                      value={newStockInput}
                      onChange={(e) => setNewStockInput(e.target.value)}
                      className="bg-[#101412] border border-[#3f4943] rounded px-1 py-0.5 text-[11px] text-[#e0e3df] flex-1"
                    >
                      {[1, 2, 3, 4, 5, 10, 15, 20].map((n) => (
                        <option key={n} value={n}>
                          {n} left
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleNewStock}
                      className="text-[9px] font-bold text-[#8ed5b1]"
                    >
                      SET
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingStock(true)}
                  className="p-2 rounded border border-dashed border-[#3f4943] hover:bg-[#363a37]/5 flex flex-col items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-[#89938c] uppercase">
                    + Stock
                  </span>
                </button>
              )}
            </div>
          </div>

          {item.admin_approved_offer && item.admin_offer_price && (
            <div className="p-2 bg-[#8ed5b1]/10 border border-[#8ed5b1]/20 rounded-lg">
              <p className="text-[10px] text-[#8ed5b1] font-semibold uppercase">
                Offer Available
              </p>
              <p className="text-sm font-bold text-[#8ed5b1]">
                {formatPrice(item.admin_offer_price, product?.currency_code)}
              </p>
              {item.admin_offer_expires_at && (
                <p className="text-[10px] text-[#bfc9c1]">
                  Expires{" "}
                  {new Date(item.admin_offer_expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {isOOS ? (
            <button
              onClick={onRemove}
              className="w-full border border-[#ffb4ab]/50 text-[#ffb4ab] py-4 rounded-xl font-bold hover:bg-[#ffb4ab]/5 transition-colors"
            >
              Remove
            </button>
          ) : (
            <button
              onClick={onAddToCart}
              disabled={addingToCart || !product?.first_variant_id}
              className="w-full bg-[#8ed5b1] text-[#003825] py-4 rounded-xl font-bold transition-transform active:scale-95 disabled:opacity-50"
            >
              {addingToCart ? "Adding..." : "Buy Now"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WishlistPage() {
  const router = useRouter()
  const [items, setItems] = useState<WishlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("all")
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const enriched = await getWishlistWithProducts()
        setItems(enriched)
      } catch (err: any) {
        const status = err?.response?.status || err?.status
        if (status === 401) {
          router.replace("/account?redirect_to=/account/wishlist")
          return
        }
      }
      setLoading(false)
    }
    fetchWishlist()
  }, [router])

  const handleRemove = async (productId: string) => {
    const success = await removeFromWishlist(productId)
    if (success) {
      setItems((prev) => prev.filter((i) => i.product_id !== productId))
    }
  }

  const handleUpdateThreshold = useCallback(
    async (itemId: string, threshold: number) => {
      const success = await updateWishlistItem(itemId, {
        stock_threshold: threshold,
      })
      if (success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, stock_threshold: threshold } : i,
          ),
        )
      }
    },
    [],
  )

  const handleUpdatePrice = useCallback(
    async (itemId: string, price: number) => {
      const success = await updateWishlistItem(itemId, { target_price: price })
      if (success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, target_price: price } : i,
          ),
        )
      }
    },
    [],
  )

  const handleClearStockAlert = useCallback(async (itemId: string) => {
    const success = await updateWishlistItem(itemId, { stock_threshold: 0 })
    if (success) {
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, stock_threshold: 0 } : i)),
      )
    }
  }, [])

  const handleClearPriceAlert = useCallback(async (itemId: string) => {
    const success = await updateWishlistItem(itemId, { target_price: null })
    if (success) {
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, target_price: null } : i)),
      )
    }
  }, [])

  const handleSetStockAlert = useCallback(
    async (itemId: string, threshold: number) => {
      const success = await updateWishlistItem(itemId, {
        stock_threshold: threshold,
      })
      if (success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, stock_threshold: threshold } : i,
          ),
        )
      }
    },
    [],
  )

  const handleSetPriceAlert = useCallback(
    async (itemId: string, price: number) => {
      const success = await updateWishlistItem(itemId, { target_price: price })
      if (success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, target_price: price } : i,
          ),
        )
      }
    },
    [],
  )

  const handleAddToCart = useCallback(
    async (variantId: string, itemId: string) => {
      setAddingToCart(itemId)
      try {
        await addToCart({ variantId, quantity: 1, countryCode: "au" })
      } catch {}
      setAddingToCart(null)
    },
    [],
  )

  if (loading) {
    return <div className="animate-pulse h-48 bg-hg-surface rounded-xl" />
  }

  const getFilteredItems = (): WishlistEntry[] => {
    switch (activeTab) {
      case "all":
        return items
      case "watching":
        return items.filter(
          (i) =>
            (i.stock_threshold ?? 0) === 0 &&
            !i.target_price &&
            (i.product?.total_inventory ?? 0) > 0,
        )
      case "low_stock":
        return items.filter(
          (i) =>
            (i.stock_threshold ?? 0) > 0 &&
            (i.product?.total_inventory ?? 0) > 0,
        )
      case "price":
        return items.filter((i) => !!i.target_price)
      case "restock":
        return items.filter((i) => (i.product?.total_inventory ?? 0) === 0)
      default:
        return items
    }
  }

  const filteredItems = getFilteredItems()

  const getTabCount = (tab: Tab): number => {
    switch (tab) {
      case "all":
        return items.length
      case "watching":
        return items.filter(
          (i) =>
            (i.stock_threshold ?? 0) === 0 &&
            !i.target_price &&
            (i.product?.total_inventory ?? 0) > 0,
        ).length
      case "low_stock":
        return items.filter(
          (i) =>
            (i.stock_threshold ?? 0) > 0 &&
            (i.product?.total_inventory ?? 0) > 0,
        ).length
      case "price":
        return items.filter((i) => !!i.target_price).length
      case "restock":
        return items.filter((i) => (i.product?.total_inventory ?? 0) === 0)
          .length
      default:
        return 0
    }
  }

  return (
    <div className="w-full" data-testid="wishlist-page-wrapper">
      <div className="mb-10 flex flex-col gap-y-2">
        <h1 className="text-[48px] font-bold tracking-[-0.04em] leading-[1.1] text-[#e0e3df]">
          Wishlist
        </h1>
        <p className="text-[18px] leading-[1.6] text-[#bfc9c1] max-w-[600px]">
          The drops you&apos;re watching in your curated Collection. Stay
          updated on stock levels and price movements.
        </p>
      </div>

      <div className="flex mb-6 w-full md:w-fit">
        <div className="flex items-center p-1 bg-[#171E1B] border border-white/5 rounded-xl w-full md:w-auto overflow-x-auto">
          {TABS.map((tab) => {
            const count = getTabCount(tab.key)
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-[12px] font-semibold uppercase tracking-[0.05em] leading-none transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-[#63A987] text-[#101412]"
                    : "text-[#7E8982] hover:text-white"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="text-[10px] opacity-40">{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-[#1d201e]/30 border border-dashed border-[#3f4943]/50 rounded-xl flex flex-col items-center justify-center p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#1d201e] flex items-center justify-center mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-[#89938c]"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <h4 className="text-lg font-bold text-[#e0e3df] mb-1">
            {activeTab === "all" && "Your wishlist is empty"}
            {activeTab === "watching" && "Nothing being watched"}
            {activeTab === "low_stock" && "No stock alerts set"}
            {activeTab === "price" && "No price alerts set"}
            {activeTab === "restock" && "No sold-out items tracked"}
          </h4>
          <p className="text-sm text-[#bfc9c1] mb-6">
            Browse the collection to add items to your wishlist.
          </p>
          <LocalizedClientLink
            href="/store"
            className="text-[#8ed5b1] font-bold text-sm hover:underline"
          >
            Explore Collection
          </LocalizedClientLink>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onRemove={() => handleRemove(item.product_id)}
              onUpdatePrice={(price) => handleUpdatePrice(item.id, price)}
              onUpdateThreshold={(threshold) =>
                handleUpdateThreshold(item.id, threshold)
              }
              onClearStockAlert={() => handleClearStockAlert(item.id)}
              onClearPriceAlert={() => handleClearPriceAlert(item.id)}
              onSetStockAlert={(threshold) =>
                handleSetStockAlert(item.id, threshold)
              }
              onSetPriceAlert={(price) => handleSetPriceAlert(item.id, price)}
              onAddToCart={() =>
                item.product?.first_variant_id &&
                handleAddToCart(item.product.first_variant_id, item.id)
              }
              addingToCart={addingToCart === item.id}
            />
          ))}
          <LocalizedClientLink
            href="/store"
            className="bg-[#1d201e]/30 border border-dashed border-[#3f4943]/50 rounded-xl flex flex-col items-center justify-center h-[620px] p-10 text-center group hover:border-[#8ed5b1]/50 transition-colors"
          >
            <div className="w-16 h-16 rounded-full bg-[#1d201e] flex items-center justify-center mb-4 group-hover:bg-[#8ed5b1]/10 transition-colors">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-[#89938c] group-hover:text-[#8ed5b1] transition-colors"
              >
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
              </svg>
            </div>
            <h4 className="text-[24px] font-semibold text-[#e0e3df] tracking-[-0.01em] leading-[1.3] mb-1">
              Find more drops
            </h4>
            <p className="text-[14px] leading-[1.5] text-[#bfc9c1] mb-4">
              Browse the collection to add more items to your wishlist.
            </p>
            <span className="text-[#8ed5b1] font-semibold text-[14px] group-hover:underline">
              Explore Collection
            </span>
          </LocalizedClientLink>
        </div>
      )}
    </div>
  )
}
