import React, { Suspense } from "react"
import Link from "next/link"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import TechnicalSpecs from "@modules/products/components/technical-specs"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import WishlistManagementPanel from "@modules/wishlist/components/wishlist-management-panel"
import LikeButton from "@modules/likes/components/like-button"
import ShareButton from "@modules/products/components/share-button"
import BuyAtPriceBanner from "@modules/products/components/buy-at-price-banner"
import ProductPill from "@modules/products/components/product-pill"
import Icon from "@modules/common/components/icon"
import EarlyAccessCountdown from "@modules/store/components/early-access-countdown"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import {
  canCustomerAccessProduct,
  HOURS_BEFORE_PUBLIC_BY_TIER,
  type Tier,
} from "@retail-example/shared-types"

import ProductActionsWrapper from "./product-actions-wrapper"
import type { BeerStyle } from "@lib/data/beer-styles"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
  thumbnail?: string | null
  canSeePricing?: boolean
  membershipStatus?: string
  existingRestockAlertId?: string | null
  buyAtPriceOffer?: {
    offerPrice: number
    currencyCode: string
    expiresAt: string | null
  } | null
  earlyAccessOffsets?: typeof HOURS_BEFORE_PUBLIC_BY_TIER
  viewerTier?: Tier | null
  beerStyle?: BeerStyle | null
  hopProvenance?: string | null
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
  thumbnail,
  canSeePricing = true,
  membershipStatus = "public",
  existingRestockAlertId = null,
  buyAtPriceOffer = null,
  earlyAccessOffsets,
  viewerTier = null,
  beerStyle = null,
  hopProvenance = null,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  const metadata = product.metadata as Record<string, any> | null
  const isOutOfStock = product.variants?.every(
    (v: any) => (v.inventory_quantity ?? 0) === 0,
  )
  const linkedBreweries: Array<{ slug: string; name?: string }> =
    (product as any).breweries || []
  const primarySlug = metadata?.brewery_slug
  const collabPartners: string[] = linkedBreweries
    .filter((b) => b.slug && b.slug !== primarySlug)
    .map((b) => b.slug)
  const breweryName =
    ((metadata?.brewery_name || metadata?.brewery) as string | undefined) ?? ""
  const releaseAt = (metadata?.release_at as string | undefined) ?? null
  const earlyAccessUntil =
    (metadata?.early_access_until as string | undefined) ?? null

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
    <>
      <main className="max-w-[1440px] mx-auto px-6 py-6 lg:py-8 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 lg:sticky lg:top-8">
            <div className="relative">
              <ImageGallery images={images} thumbnail={thumbnail} />
              {!canSeePricing && (
                <div className="absolute inset-0 z-10 rounded-xl bg-hg-surface/60 backdrop-blur-[6px] flex flex-col items-center justify-center gap-3">
                  <Icon
                    name="lock"
                    size={32}
                    className="text-hg-text-secondary"
                  />
                  <span className="text-sm font-semibold text-hg-text-secondary uppercase tracking-wider">
                    Members Only
                  </span>
                  <a
                    href="/apply"
                    className="text-xs text-hl-primary hover:underline"
                  >
                    Apply for membership →
                  </a>
                </div>
              )}
              <ProductPill product={product} />
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-8">
            <ProductInfo
              product={product}
              canSeePricing={canSeePricing}
              beerStyle={beerStyle}
            />

            {(releaseAt || earlyAccessUntil) && (
              <EarlyAccessCountdown
                releaseAt={releaseAt}
                earlyAccessUntil={earlyAccessUntil}
                offsets={earlyAccessOffsets}
                viewerTier={viewerTier}
                className="text-body-sm text-hg-text-secondary leading-relaxed -mt-4 p-4 bg-hg-surface border border-hg-border/30 rounded-xl"
              />
            )}

            {collabPartners.length > 0 && (
              <p className="text-sm text-hg-text-muted -mt-4">
                Collaboration with{" "}
                {collabPartners.map((slug, i) => (
                  <span key={slug}>
                    {i > 0 && ", "}
                    <a
                      href={`/breweries/${slug}`}
                      className="text-hl-primary hover:underline"
                    >
                      {slug
                        .replace(/-/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </a>
                  </span>
                ))}
              </p>
            )}

            {canSeePricing && buyAtPriceOffer && (
              <BuyAtPriceBanner
                offerPrice={buyAtPriceOffer.offerPrice}
                currencyCode={buyAtPriceOffer.currencyCode}
                expiresAt={buyAtPriceOffer.expiresAt}
              />
            )}

            {canSeePricing && hasEarlyAccess ? (
              <>
                <ProductOnboardingCta />
                <Suspense
                  fallback={
                    <ProductActions
                      disabled={true}
                      product={product}
                      region={region}
                      existingRestockAlertId={existingRestockAlertId}
                    />
                  }
                >
                  <ProductActionsWrapper
                    id={product.id}
                    region={region}
                    existingRestockAlertId={existingRestockAlertId}
                  />
                </Suspense>

                {!isOutOfStock && (
                  <WishlistManagementPanel productId={product.id} />
                )}

                <div className="flex items-center gap-2 border-b border-hg-border/20 pb-4">
                  <LikeButton productId={product.id} variant="detail" />
                  <ShareButton
                    productTitle={product.title || ""}
                    breweryName={breweryName}
                    thumbnail={thumbnail}
                  />
                </div>
              </>
            ) : canSeePricing && !hasEarlyAccess ? (
              <div className="flex flex-col gap-y-4 p-6 bg-hg-surface border border-hg-border/30 rounded-xl">
                <p className="text-[14px] text-hg-text-secondary">
                  This release hasn't unlocked for your tier yet. Check back
                  soon or upgrade your VIP status to unlock early access.
                </p>
                <Link
                  href="/account/vip"
                  className="text-hl-primary text-sm font-semibold hover:underline"
                >
                  View your VIP progress →
                </Link>
                <span className="bg-hg-surface-dim text-hg-text-secondary py-3 px-6 rounded-xl text-center font-semibold text-[14px] uppercase tracking-wider">
                  Not Yet Available
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-y-4 p-6 bg-hg-surface border border-hg-border/30 rounded-xl">
                {membershipStatus === "pending" ? (
                  <>
                    <p className="text-[14px] text-hg-text-secondary">
                      Your membership application is being reviewed. Pricing
                      will be available once approved.
                    </p>
                    <span className="bg-hg-surface-dim text-hg-text-secondary py-3 px-6 rounded-xl text-center font-semibold text-[14px] uppercase tracking-wider">
                      Application Pending
                    </span>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] text-hg-text-secondary">
                      Trades are available to approved members only.
                    </p>
                    <a
                      href="/apply"
                      className="bg-hl-primary text-white py-3 px-6 rounded-xl text-center font-semibold text-[14px] uppercase tracking-wider hover:opacity-90 transition-all"
                    >
                      Apply for Membership
                    </a>
                  </>
                )}
              </div>
            )}

            <TechnicalSpecs
              product={product}
              canSeePricing={canSeePricing}
              beerStyle={beerStyle}
              hopProvenance={hopProvenance}
            />
          </div>
        </div>
      </main>

      <div className="max-w-[1440px] mx-auto px-6 mt-24">
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts
            product={product}
            countryCode={countryCode}
            canSeePricing={canSeePricing}
          />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
