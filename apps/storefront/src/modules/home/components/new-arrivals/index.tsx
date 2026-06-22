import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import AddToCartButton from "@modules/products/components/product-list-item/add-to-cart-button"
import EarlyAccessOverlay from "@modules/products/components/early-access-overlay"
import ProductPill from "@modules/products/components/product-pill"
import { getProductPrice } from "@lib/util/get-product-price"
import {
  canCustomerAccessProduct,
  HOURS_BEFORE_PUBLIC_BY_TIER,
  type Tier,
} from "@retail-example/shared-types"

type NewArrivalsProps = {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
  canSeePricing?: boolean
  viewerTier?: Tier | null
  earlyAccessOffsets?: typeof HOURS_BEFORE_PUBLIC_BY_TIER
}

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
  return meta?.abv ? `${meta.abv}%` : ""
}

function getStock(product: HttpTypes.StoreProduct): number {
  if (!product.variants) return 0
  return product.variants.reduce(
    (sum, v: any) => sum + (v.inventory_quantity ?? 0),
    0,
  )
}

const NewArrivals = ({
  products,
  region,
  canSeePricing = true,
  viewerTier = null,
  earlyAccessOffsets,
}: NewArrivalsProps) => {
  if (!products?.length) return null

  return (
    <section className="py-16 bg-[var(--color-bg)]">
      <div className="max-w-[1440px] mx-auto px-6 mb-6">
        <span className="text-hg-gold text-xs font-semibold uppercase tracking-[0.15em] mb-1 block">
          Fresh In
        </span>
        <h2 className="text-h2 text-hg-text">New Arrivals</h2>
      </div>
      <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-3 gap-y-8 small:gap-x-6 small:gap-y-10 max-w-[1440px] mx-auto px-6">
        {products.slice(0, 8).map((product) => {
          const brewery = getBreweryName(product)
          const beerName = getBeerName(product)
          const style = getStyle(product)
          const abv = getAbv(product)
          const stock = getStock(product)
          const soldOut = stock === 0
          const { cheapestPrice } = getProductPrice({ product })
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
                ? new Date(
                    new Date(earlyAccessUntil).getTime() - 24 * 3600 * 1000,
                  )
                : null
            if (!release || isNaN(release.getTime())) return true
            const publicAccess = new Date(release.getTime() + 24 * 3600 * 1000)
            if (!viewerTier) return false
            return canCustomerAccessProduct(
              viewerTier,
              publicAccess,
              new Date(),
            )
          })()

          return (
            <li key={product.id}>
              <article className="flex flex-col gap-3 group">
                <LocalizedClientLink href={`/products/${product.handle}`}>
                  <div className="aspect-square w-full bg-hg-surface-dim rounded-lg overflow-hidden relative">
                    <Thumbnail
                      thumbnail={product.thumbnail}
                      images={product.images}
                      size="full"
                      className="w-full h-full object-contain p-3 grayscale-[0.1] group-hover:grayscale-0 group-hover:scale-[1.03] transition-all duration-500"
                    />
                    {!canSeePricing && (
                      <div className="absolute inset-0 bg-hg-surface/60 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center gap-2">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-hg-text-secondary"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-hg-text-secondary">
                          Members Only
                        </span>
                      </div>
                    )}
                    <ProductPill product={product} />
                    {canSeePricing &&
                      ((product.metadata as any)?.release_at ||
                        (product.metadata as any)?.early_access_until) && (
                        <EarlyAccessOverlay
                          releaseAt={
                            (product.metadata as any)?.release_at ?? null
                          }
                          earlyAccessUntil={
                            (product.metadata as any)?.early_access_until ??
                            null
                          }
                          offsets={earlyAccessOffsets}
                          viewerTier={viewerTier}
                        />
                      )}
                  </div>
                </LocalizedClientLink>
                <div className="flex flex-col">
                  {brewery && (
                    <span className="text-[11px] font-semibold text-hg-gold uppercase tracking-[0.12em]">
                      {brewery}
                    </span>
                  )}
                  <LocalizedClientLink href={`/products/${product.handle}`}>
                    <h3 className="text-[15px] font-bold text-hg-text leading-snug capitalize line-clamp-2">
                      {beerName}
                    </h3>
                  </LocalizedClientLink>
                  {canSeePricing && (style || abv) && (
                    <span className="text-[11px] text-hg-text-secondary mt-0.5">
                      {style}
                      {style && abv ? " · " : ""}
                      {abv}
                    </span>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    {canSeePricing && cheapestPrice ? (
                      <span className="text-lg font-bold text-hg-text">
                        {cheapestPrice.calculated_price}
                      </span>
                    ) : (
                      <span className="text-[11px] text-hg-text-secondary uppercase tracking-wider">
                        {canSeePricing ? "" : "Members Only"}
                      </span>
                    )}
                    {soldOut ? (
                      <span className="text-[11px] font-bold text-hg-text-secondary uppercase tracking-wider">
                        Sold Out
                      </span>
                    ) : hasEarlyAccess && variantId ? (
                      <AddToCartButton variantId={variantId} compact />
                    ) : hasEarlyAccess ? (
                      <LocalizedClientLink
                        href={`/products/${product.handle}`}
                        className="text-[11px] font-bold uppercase tracking-wider text-hg-text hover:text-hg-gold transition-colors"
                      >
                        View
                      </LocalizedClientLink>
                    ) : null}
                  </div>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default NewArrivals
