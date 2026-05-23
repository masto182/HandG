import React, { Suspense } from "react"

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
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"

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
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  const metadata = product.metadata as Record<string, any> | null
  const isOutOfStock = product.variants?.every((v: any) => (v.inventory_quantity ?? 0) === 0)
  const collabPartners: string[] = metadata?.collab_partners || []

  return (
    <>
      <main className="max-w-[1440px] mx-auto px-6 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 sticky top-32">
            <div className="relative">
              <ImageGallery images={images} thumbnail={thumbnail} />
              <ProductPill product={product} />
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-8">
            <ProductInfo product={product} canSeePricing={canSeePricing} />

            {collabPartners.length > 0 && (
              <p className="text-sm text-hg-text-muted -mt-4">
                Collaboration with{" "}
                {collabPartners.map((slug, i) => (
                  <span key={slug}>
                    {i > 0 && ", "}
                    <a href={`/breweries/${slug}`} className="text-hl-primary hover:underline">
                      {slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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

            {canSeePricing ? (
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
                  <ProductActionsWrapper id={product.id} region={region} existingRestockAlertId={existingRestockAlertId} />
                </Suspense>

                {!isOutOfStock && (
                  <WishlistManagementPanel productId={product.id} />
                )}

                <div className="flex items-center gap-6 py-4 px-2 border-b border-hg-border/20">
                  <LikeButton productId={product.id} variant="detail" />
                  <ShareButton />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-y-4 p-6 bg-hg-surface border border-hg-border/30 rounded-xl">
                {membershipStatus === "pending" ? (
                  <>
                    <p className="text-[14px] text-hg-text-secondary">
                      Your membership application is being reviewed. Pricing will be available once approved.
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
                    <a href="/apply" className="bg-hl-primary text-white py-3 px-6 rounded-xl text-center font-semibold text-[14px] uppercase tracking-wider hover:opacity-90 transition-all">
                      Apply for Membership
                    </a>
                  </>
                )}
              </div>
            )}

            <TechnicalSpecs product={product} canSeePricing={canSeePricing} />
          </div>
        </div>
      </main>

      <div className="max-w-[1440px] mx-auto px-6 mt-24">
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} canSeePricing={canSeePricing} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
