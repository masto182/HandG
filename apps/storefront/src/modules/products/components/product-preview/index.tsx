import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"
import AddToCartButton from "../product-list-item/add-to-cart-button"
import Icon from "@modules/common/components/icon"
import ProductPill from "@modules/products/components/product-pill"
import SpecialCountdown from "@modules/products/components/special-countdown"
import EarlyAccessOverlay from "@modules/products/components/early-access-overlay"
import type { ActiveSpecial } from "@lib/data/specials"
import {
  canCustomerAccessProduct,
  HOURS_BEFORE_PUBLIC_BY_TIER,
  type Tier,
} from "@retail-example/shared-types"

function getBreweryName(product: HttpTypes.StoreProduct): string {
  const meta = product.metadata as any
  if (meta?.brewery_name) return meta.brewery_name
  if (meta?.brewery) return meta.brewery
  return ""
}

function getBeerName(product: HttpTypes.StoreProduct): string {
  const sep = (product.title || "").indexOf(" — ")
  if (sep !== -1) return (product.title || "").slice(sep + 3)
  return product.title || ""
}

function getStyle(product: HttpTypes.StoreProduct): string {
  const meta = product.metadata as any
  return meta?.style || ""
}

function getAbv(product: HttpTypes.StoreProduct): string {
  const meta = product.metadata as any
  return meta?.abv ? `${meta.abv}% ABV` : ""
}

function getStockStatus(product: HttpTypes.StoreProduct): {
  label: string
  dotClass: string
  soldOut: boolean
} {
  if (!product.variants)
    return { label: "IN STOCK", dotClass: "bg-hl-accent", soldOut: false }
  const total = product.variants.reduce(
    (sum: number, v: any) => sum + (v.inventory_quantity ?? 0),
    0,
  )
  if (total <= 0)
    return {
      label: "SOLD OUT",
      dotClass: "bg-hg-text-secondary/40",
      soldOut: true,
    }
  if (total <= 2)
    return { label: "VERY LOW STOCK", dotClass: "bg-hl-error", soldOut: false }
  if (total <= 6)
    return { label: "LOW STOCK", dotClass: "bg-hl-warning", soldOut: false }
  return { label: "IN STOCK", dotClass: "bg-hl-accent", soldOut: false }
}

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
  canSeePricing = true,
  activeSpecial,
  viewerTier = null,
  earlyAccessOffsets,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
  canSeePricing?: boolean
  activeSpecial?: ActiveSpecial | null
  viewerTier?: Tier | null
  earlyAccessOffsets?: typeof HOURS_BEFORE_PUBLIC_BY_TIER
}) {
  const { cheapestPrice } = getProductPrice({ product })

  const brewery = getBreweryName(product)
  const beerName = getBeerName(product)
  const style = getStyle(product)
  const abv = canSeePricing ? getAbv(product) : ""
  const stock = getStockStatus(product)
  const variantId = product.variants?.[0]?.id
  const soldOut = stock.soldOut
  const meta = product.metadata as any
  const releaseAt = (meta?.release_at as string | undefined) ?? null
  const earlyAccessUntil =
    (meta?.early_access_until as string | undefined) ?? null

  const hasEarlyAccess = (() => {
    if (!canSeePricing) return false
    if (!releaseAt && !earlyAccessUntil) return true
    const release = releaseAt
      ? new Date(releaseAt)
      : earlyAccessUntil
        ? new Date(new Date(earlyAccessUntil).getTime() - 24 * 3600 * 1000)
        : null
    if (!release || isNaN(release.getTime())) return true
    const publicAccess = new Date(release.getTime() + 24 * 3600 * 1000)
    if (!viewerTier) return false
    return canCustomerAccessProduct(viewerTier, publicAccess, new Date())
  })()

  return (
    <article className="flex flex-col gap-3">
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="group"
      >
        <div className="aspect-square w-full bg-hg-surface-dim rounded-lg overflow-hidden relative">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
            alt={product.title}
            className="w-full h-full object-contain p-3 grayscale-[0.1] group-hover:grayscale-0 group-hover:scale-[1.03] transition-all duration-500"
          />
          <ProductPill product={product} activeSpecial={activeSpecial} />
          {activeSpecial?.ends_at && (
            <SpecialCountdown endsAt={activeSpecial.ends_at} />
          )}
          {!canSeePricing && (
            <div className="absolute inset-0 bg-hg-surface/60 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center gap-2">
              <Icon name="lock" size={28} className="text-hg-text-secondary" />
              <span className="text-[11px] font-bold text-hg-text-secondary uppercase tracking-widest">
                Members Only
              </span>
            </div>
          )}
          {canSeePricing && (releaseAt || earlyAccessUntil) && (
            <EarlyAccessOverlay
              releaseAt={releaseAt}
              earlyAccessUntil={earlyAccessUntil}
              offsets={earlyAccessOffsets}
              viewerTier={viewerTier}
            />
          )}
        </div>
      </LocalizedClientLink>
      <div className="space-y-1 px-0.5">
        <span className="block font-semibold text-[11px] text-hg-gold uppercase tracking-wider">
          {brewery}
        </span>
        <h2 className="text-[15px] text-hg-text font-bold leading-snug capitalize line-clamp-2">
          {beerName}
        </h2>
        {canSeePricing && (style || abv) && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-hg-text-secondary uppercase tracking-wider">
            {style && <span>{style}</span>}
            {style && abv && <span className="text-hg-border">·</span>}
            {abv && <span>{abv}</span>}
          </div>
        )}
        {canSeePricing && (
          <div className="flex items-end justify-between gap-2 pt-2">
            <div className="flex flex-col gap-1 min-w-0">
              {cheapestPrice && (
                <span className="font-bold text-lg text-hg-text leading-none">
                  <PreviewPrice price={cheapestPrice} />
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${stock.dotClass}`}
                />
                <span className="text-[10px] font-bold text-hg-text-secondary uppercase tracking-widest truncate">
                  {stock.label}
                </span>
              </div>
            </div>
            {soldOut ? (
              <span className="px-3 py-2 rounded-sm font-bold text-[11px] uppercase tracking-wider text-hg-text-secondary/60 border border-hg-border/30 text-nowrap">
                Sold Out
              </span>
            ) : hasEarlyAccess ? (
              variantId ? (
                <AddToCartButton variantId={variantId} compact />
              ) : (
                <LocalizedClientLink
                  href={`/products/${product.handle}`}
                  className="bg-hg-surface border border-hg-border/60 text-hg-text px-3 py-2 rounded-sm font-bold text-[11px] uppercase tracking-wider hover:bg-hg-gold hover:text-hg-bg hover:border-hg-gold transition-colors text-nowrap"
                >
                  View
                </LocalizedClientLink>
              )
            ) : null}
          </div>
        )}
      </div>
    </article>
  )
}
