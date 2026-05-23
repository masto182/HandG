"use client"

import { useEffect, useState, useCallback } from "react"
import { getWishlistWithProducts, removeFromWishlist, updateWishlistItem, WishlistEntry } from "@lib/data/wishlist"
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
  if (amount == null) return "—"
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount)
}

function StockBadge({ inventory }: { inventory: number }) {
  if (inventory === 0) return <span className="text-[11px] font-semibold text-hl-error bg-hl-error/10 px-2 py-0.5 rounded-full">Sold Out</span>
  if (inventory <= 3) return <span className="text-[11px] font-semibold text-hl-warning bg-hl-warning/10 px-2 py-0.5 rounded-full">Only {inventory} left</span>
  if (inventory <= 10) return <span className="text-[11px] font-semibold text-hg-gold bg-hg-gold/10 px-2 py-0.5 rounded-full">{inventory} left</span>
  return <span className="text-[11px] font-medium text-hl-success bg-hl-success/10 px-2 py-0.5 rounded-full">In Stock</span>
}

function WatchingCard({
  item,
  onRemove,
  onUpdateThreshold,
  onAddToCart,
  onUpdateMode,
  addingToCart,
}: {
  item: WishlistEntry
  onRemove: () => void
  onUpdateThreshold: (threshold: number) => void
  onAddToCart: () => void
  onUpdateMode: (mode: string) => void
  addingToCart: boolean
}) {
  const product = item.product
  const isStockAlert = item.mode === "low_stock_alert"

  return (
    <div className="bg-hg-surface border border-hg-border rounded-xl overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-hg-bg">
        {product?.thumbnail ? (
          <LocalizedClientLink href={`/products/${product.handle}`}>
            <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
          </LocalizedClientLink>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-hg-text-muted">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-hg-bg/80 backdrop-blur flex items-center justify-center text-hg-text-secondary hover:text-hl-error transition-colors"
          aria-label="Remove"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <LocalizedClientLink href={product?.handle ? `/products/${product.handle}` : "#"} className="text-sm font-semibold text-hg-text hover:text-hg-gold transition-colors line-clamp-2 mb-1">
          {product?.title || "Unknown Product"}
        </LocalizedClientLink>
        <p className="text-[11px] text-hg-text-secondary mb-3">
          {(product?.metadata as any)?.brewery_name || ""}
        </p>
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between">
            <StockBadge inventory={product?.total_inventory ?? 0} />
            {product?.cheapest_price != null && (
              <span className="text-sm font-bold text-hg-text">{formatPrice(product.cheapest_price, product.currency_code)}</span>
            )}
          </div>
          {isStockAlert && (product?.total_inventory ?? 0) > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-hg-text-secondary">
              <span>Alert at</span>
              <select
                value={item.stock_threshold || 2}
                onChange={(e) => onUpdateThreshold(parseInt(e.target.value))}
                className="bg-hg-bg border border-hg-border rounded px-2 py-0.5 text-[11px] text-hg-text"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} left</option>
                ))}
              </select>
            </div>
          )}
          {(product?.total_inventory ?? 0) > 0 && product?.first_variant_id && (
            <button
              onClick={onAddToCart}
              disabled={addingToCart}
              className="w-full py-2 text-xs font-semibold rounded-lg bg-hl-primary text-white hover:bg-hl-primary-hover transition-colors disabled:opacity-50"
            >
              {addingToCart ? "Adding..." : "Buy Now"}
            </button>
          )}
          {item.mode === "buy_later" && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => onUpdateMode("buy_at_price")}
                className="flex-1 min-w-0 py-1.5 px-2 text-[10px] font-medium rounded-full border border-hg-border text-hg-text-secondary hover:border-hg-gold/50 hover:text-hg-gold transition-colors truncate"
              >
                Set price alert
              </button>
              <button
                onClick={() => onUpdateMode("low_stock_alert")}
                className="flex-1 min-w-0 py-1.5 px-2 text-[10px] font-medium rounded-full border border-hg-border text-hg-text-secondary hover:border-hg-gold/50 hover:text-hg-gold transition-colors truncate"
              >
                Low stock alert
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PriceCard({
  item,
  onRemove,
  onUpdatePrice,
  onAddToCart,
  addingToCart,
}: {
  item: WishlistEntry
  onRemove: () => void
  onUpdatePrice: (price: number) => void
  onAddToCart: () => void
  addingToCart: boolean
}) {
  const product = item.product
  const [editing, setEditing] = useState(false)
  const [priceInput, setPriceInput] = useState(item.target_price ? item.target_price.toFixed(2) : "")
  const currentPrice = product?.cheapest_price ?? null
  const targetMet = currentPrice != null && item.target_price != null && currentPrice <= item.target_price

  const handleSavePrice = () => {
    const val = parseFloat(priceInput)
    if (!isNaN(val) && val > 0) {
      onUpdatePrice(val)
      setEditing(false)
    }
  }

  return (
    <div className="bg-hg-surface border border-hg-border rounded-xl overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-hg-bg">
        {product?.thumbnail ? (
          <LocalizedClientLink href={`/products/${product.handle}`}>
            <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
          </LocalizedClientLink>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-hg-text-muted">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-hg-bg/80 backdrop-blur flex items-center justify-center text-hg-text-secondary hover:text-hl-error transition-colors"
          aria-label="Remove"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {targetMet && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-hl-success text-white text-[10px] font-bold uppercase">
            Price Hit
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <LocalizedClientLink href={product?.handle ? `/products/${product.handle}` : "#"} className="text-sm font-semibold text-hg-text hover:text-hg-gold transition-colors line-clamp-2 mb-1">
          {product?.title || "Unknown Product"}
        </LocalizedClientLink>
        <p className="text-[11px] text-hg-text-secondary mb-3">
          {(product?.metadata as any)?.brewery_name || ""}
        </p>
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-hg-text-muted uppercase tracking-wider">Current Price</p>
              <p className="text-sm font-bold text-hg-text">{currentPrice != null ? formatPrice(currentPrice, product?.currency_code) : "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-hg-text-muted uppercase tracking-wider">Your Buy Price</p>
              {editing ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-hg-text-secondary">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value.replace(/[^0-9.]/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && handleSavePrice()}
                    autoFocus
                    className="w-20 px-2 py-1 bg-hg-bg border border-hg-border rounded text-sm text-hg-text text-right [appearance:textfield]"
                  />
                  <button onClick={handleSavePrice} className="text-[10px] font-bold text-hl-primary hover:underline ml-1">Save</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold text-hg-gold">
                    {item.target_price ? formatPrice(item.target_price, product?.currency_code) : "Not set"}
                  </span>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1 rounded hover:bg-hg-surface-hover text-hg-text-secondary hover:text-hg-gold transition-colors"
                    aria-label="Edit price"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          {item.admin_approved_offer && item.admin_offer_price && (
            <div className="p-2 bg-hg-gold/10 border border-hg-gold/20 rounded-lg">
              <p className="text-[10px] text-hg-gold font-semibold uppercase">Offer Available</p>
              <p className="text-sm font-bold text-hg-gold">{formatPrice(item.admin_offer_price, product?.currency_code)}</p>
              {item.admin_offer_expires_at && (
                <p className="text-[10px] text-hg-text-secondary">Expires {new Date(item.admin_offer_expires_at).toLocaleDateString()}</p>
              )}
            </div>
          )}
          <button
            onClick={onAddToCart}
            disabled={addingToCart || !product?.first_variant_id}
            className="w-full py-2 text-xs font-semibold rounded-lg bg-hl-primary text-white hover:bg-hl-primary-hover transition-colors disabled:opacity-50"
          >
            {addingToCart ? "Adding..." : "Buy Now"}
          </button>
        </div>
      </div>
    </div>
  )
}

function RestockCard({ item, onRemove }: { item: WishlistEntry; onRemove: () => void }) {
  const product = item.product

  return (
    <div className="bg-hg-surface border border-hg-border rounded-xl overflow-hidden flex flex-col opacity-75">
      <div className="relative aspect-square bg-hg-bg">
        {product?.thumbnail ? (
          <LocalizedClientLink href={`/products/${product.handle}`}>
            <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover grayscale-[40%]" />
          </LocalizedClientLink>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-hg-text-muted">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-hg-bg/80 backdrop-blur flex items-center justify-center text-hg-text-secondary hover:text-hl-error transition-colors"
          aria-label="Remove"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-hg-bg/90 to-transparent p-3 pt-8">
          <span className="text-[11px] font-bold text-hl-error uppercase tracking-wider">Sold Out</span>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <LocalizedClientLink href={product?.handle ? `/products/${product.handle}` : "#"} className="text-sm font-semibold text-hg-text hover:text-hg-gold transition-colors line-clamp-2 mb-1">
          {product?.title || "Unknown Product"}
        </LocalizedClientLink>
        <p className="text-[11px] text-hg-text-secondary mb-3">
          {(product?.metadata as any)?.brewery_name || ""}
        </p>
        <div className="mt-auto">
          <div className="p-3 bg-hg-bg border border-hg-border rounded-lg text-center">
            <p className="text-[11px] text-hg-text-secondary">
              You&apos;ll be notified when this is back in stock
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("all")
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const enriched = await getWishlistWithProducts()
        setItems(enriched)
      } catch {}
      setLoading(false)
    }
    fetchWishlist()
  }, [])

  const handleRemove = async (productId: string) => {
    const success = await removeFromWishlist(productId)
    if (success) {
      setItems((prev) => prev.filter((i) => i.product_id !== productId))
    }
  }

  const handleUpdateThreshold = useCallback(async (itemId: string, threshold: number) => {
    const success = await updateWishlistItem(itemId, { stock_threshold: threshold })
    if (success) {
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, stock_threshold: threshold } : i))
    }
  }, [])

  const handleUpdatePrice = useCallback(async (itemId: string, price: number) => {
    const success = await updateWishlistItem(itemId, { target_price: price })
    if (success) {
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, target_price: price } : i))
    }
  }, [])

  const handleUpdateMode = useCallback(async (itemId: string, mode: string) => {
    const success = await updateWishlistItem(itemId, { mode })
    if (success) {
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, mode } : i))
    }
  }, [])

  const handleAddToCart = useCallback(async (variantId: string, itemId: string) => {
    setAddingToCart(itemId)
    try {
      await addToCart({ variantId, quantity: 1, countryCode: "au" })
    } catch {}
    setAddingToCart(null)
  }, [])

  if (loading) {
    return <div className="animate-pulse h-48 bg-hg-surface rounded-xl" />
  }

  const getFilteredItems = (): WishlistEntry[] => {
    switch (activeTab) {
      case "all":
        return items
      case "watching":
        return items.filter((i) => i.mode === "buy_later" && (i.product?.total_inventory ?? 0) > 0)
      case "low_stock":
        return items.filter((i) => i.mode === "low_stock_alert" && (i.product?.total_inventory ?? 0) > 0)
      case "price":
        return items.filter((i) => i.mode === "buy_at_price")
      case "restock":
        return items.filter((i) => (i.product?.total_inventory ?? 0) === 0)
      default:
        return items
    }
  }

  const filteredItems = getFilteredItems()

  const getTabCount = (tab: Tab): number => {
    switch (tab) {
      case "all": return items.length
      case "watching": return items.filter((i) => i.mode === "buy_later" && (i.product?.total_inventory ?? 0) > 0).length
      case "low_stock": return items.filter((i) => i.mode === "low_stock_alert" && (i.product?.total_inventory ?? 0) > 0).length
      case "price": return items.filter((i) => i.mode === "buy_at_price").length
      case "restock": return items.filter((i) => (i.product?.total_inventory ?? 0) === 0).length
      default: return 0
    }
  }

  const renderCard = (item: WishlistEntry) => {
    const inv = item.product?.total_inventory ?? -1

    if (activeTab === "restock" || (inv === 0 && activeTab !== "price" && activeTab !== "watching" && activeTab !== "low_stock")) {
      return <RestockCard key={item.id} item={item} onRemove={() => handleRemove(item.product_id)} />
    }

    if (item.mode === "buy_at_price") {
      return (
        <PriceCard
          key={item.id}
          item={item}
          onRemove={() => handleRemove(item.product_id)}
          onUpdatePrice={(price) => handleUpdatePrice(item.id, price)}
          onAddToCart={() => item.product?.first_variant_id && handleAddToCart(item.product.first_variant_id, item.id)}
          addingToCart={addingToCart === item.id}
        />
      )
    }

    return (
      <WatchingCard
        key={item.id}
        item={item}
        onRemove={() => handleRemove(item.product_id)}
        onUpdateThreshold={(threshold) => handleUpdateThreshold(item.id, threshold)}
        onAddToCart={() => item.product?.first_variant_id && handleAddToCart(item.product.first_variant_id, item.id)}
        onUpdateMode={(mode) => handleUpdateMode(item.id, mode)}
        addingToCart={addingToCart === item.id}
      />
    )
  }

  return (
    <div className="w-full" data-testid="wishlist-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-2">
        <h1 className="text-h2 text-on-surface">Wishlist</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          The drops you&apos;re watching in your curated Collection.
        </p>
      </div>

      <div className="flex items-center gap-1 mb-8 p-1 bg-hg-bg border border-hg-border rounded-lg w-fit">
        {TABS.map((tab) => {
          const count = getTabCount(tab.key)
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-hl-primary text-white shadow-sm"
                  : "text-hg-text-secondary hover:text-hg-text"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-hg-surface text-hg-text-secondary"
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {filteredItems.length === 0 ? (
        <div className="p-12 bg-hg-surface border border-hg-border rounded-xl text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-hg-text-muted">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <p className="text-hg-text-secondary text-sm mb-4">
            {activeTab === "all" && "Your wishlist is empty."}
            {activeTab === "watching" && "No items you're watching right now."}
            {activeTab === "low_stock" && "No low stock alerts set."}
            {activeTab === "price" && "No price alerts set."}
            {activeTab === "restock" && "No sold-out items being tracked."}
          </p>
          <a
            href="/store"
            className="inline-block px-6 py-2.5 text-sm font-medium text-white bg-hl-primary hover:bg-hl-primary-hover rounded-lg transition-colors"
          >
            Browse the Collection
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(renderCard)}
        </div>
      )}
    </div>
  )
}
