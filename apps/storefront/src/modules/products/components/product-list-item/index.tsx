import { HttpTypes } from "@medusajs/types"
import { getProductPrice } from "@lib/util/get-product-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "../product-preview/price"
import AddToCartButton from "./add-to-cart-button"
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
  return (product.metadata as any)?.style || ""
}

function getAbv(product: HttpTypes.StoreProduct): string {
  const abv = (product.metadata as any)?.abv
  return abv ? `${abv}%` : ""
}

function getUntappdScore(product: HttpTypes.StoreProduct): string {
  const score = (product.metadata as any)?.untappd_score
  return score ? Number(score).toFixed(1) : ""
}

export default async function ProductListItem({
  product,
  region,
  canSeePricing = true,
  viewerTier = null,
  earlyAccessOffsets,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  canSeePricing?: boolean
  viewerTier?: Tier | null
  earlyAccessOffsets?: typeof HOURS_BEFORE_PUBLIC_BY_TIER
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const brewery = getBreweryName(product)
  const beerName = getBeerName(product)
  const style = getStyle(product)
  const abv = canSeePricing ? getAbv(product) : ""
  const untappdScore = canSeePricing ? getUntappdScore(product) : ""
  const variantId = product.variants?.[0]?.id
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
    <article
      className={`grid grid-cols-1 md:grid-cols-12 items-center border-b border-hg-border/60 gap-8 hover:bg-hg-surface-dim/30 transition-all px-4 group py-4`}
    >
      <div
        className={`col-span-1 ${canSeePricing ? "md:col-span-5" : "md:col-span-10"} flex items-center gap-6`}
      >
        <LocalizedClientLink
          href={`/products/${product.handle}`}
          className="w-20 h-20 bg-hg-surface-dim rounded-md overflow-hidden flex-shrink-0 border border-hg-border/50 group-hover:border-hg-gold/30 transition-colors relative"
        >
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="square"
            alt={product.title}
            className="w-full h-full object-cover grayscale-[0.2]"
          />
          {!canSeePricing && (
            <div className="absolute inset-0 bg-hg-surface/60 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center gap-1">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-hg-text-secondary"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-[8px] font-bold uppercase tracking-wider text-hg-text-secondary">
                Members Only
              </span>
            </div>
          )}
          {canSeePricing && !hasEarlyAccess && (
            <div className="absolute inset-0 bg-hg-overlay-bg backdrop-blur-[4px] flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-hg-overlay-text opacity-70"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          )}
        </LocalizedClientLink>
        <LocalizedClientLink
          href={`/products/${product.handle}`}
          className="flex flex-col gap-1"
        >
          <span className="font-semibold text-[11px] text-hg-gold uppercase tracking-wider">
            {brewery}
          </span>
          <h2 className="text-lg text-hg-text font-bold leading-tight">
            {beerName}
          </h2>
        </LocalizedClientLink>
      </div>
      {canSeePricing && (
        <div className="col-span-2 hidden small:flex flex-col min-w-0">
          <span className="text-sm text-hg-text font-medium truncate">
            {style}
          </span>
        </div>
      )}
      {canSeePricing && (
        <div className="col-span-1 hidden medium:flex flex-col">
          <span className="text-sm text-hg-text font-medium">{abv}</span>
        </div>
      )}
      {canSeePricing && (
        <div className="col-span-2 hidden md:flex items-center">
          {untappdScore && (
            <span className="inline-flex items-center gap-1">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-hg-gold flex-shrink-0"
              >
                <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7-5.4-4.7 7.1-.6z" />
              </svg>
              <span className="text-sm text-hg-text font-medium">
                {untappdScore}
              </span>
            </span>
          )}
        </div>
      )}
      <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-3 h-full">
        {canSeePricing && cheapestPrice && (
          <span className="font-bold text-lg text-hg-text">
            <PreviewPrice price={cheapestPrice} />
          </span>
        )}
        {hasEarlyAccess && variantId && (
          <AddToCartButton variantId={variantId} compact />
        )}
      </div>
    </article>
  )
}
