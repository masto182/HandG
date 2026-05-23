import { HttpTypes } from "@medusajs/types"
import { getProductPrice } from "@lib/util/get-product-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "../product-preview/price"
import AddToCartButton from "./add-to-cart-button"

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

function getFreshnessDays(product: HttpTypes.StoreProduct): string {
  const released = (product.metadata as any)?.released_date
  if (!released) return ""
  const d = new Date(released)
  if (isNaN(d.getTime())) return ""
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return "SOON"
  return `${days} DAYS`
}

export default async function ProductListItem({
  product,
  region,
  canSeePricing = true,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  canSeePricing?: boolean
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const brewery = getBreweryName(product)
  const beerName = getBeerName(product)
  const style = getStyle(product)
  const abv = canSeePricing ? getAbv(product) : ""
  const freshness = canSeePricing ? getFreshnessDays(product) : ""
  const variantId = product.variants?.[0]?.id

  return (
    <article className={`grid grid-cols-1 lg:grid-cols-12 items-center border-b border-hg-border/60 gap-8 hover:bg-hg-surface-dim/30 transition-all px-4 group py-4`}>
      <div className={`col-span-1 ${canSeePricing ? "lg:col-span-5" : "lg:col-span-10"} flex items-center gap-6`}>
        <LocalizedClientLink href={`/products/${product.handle}`} className="w-20 h-24 bg-hg-surface-dim rounded-md overflow-hidden flex-shrink-0 border border-hg-border/50 group-hover:border-hg-gold/30 transition-colors">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="square"
            className="w-full h-full object-cover grayscale-[0.2]"
          />
        </LocalizedClientLink>
        <LocalizedClientLink href={`/products/${product.handle}`} className="flex flex-col gap-1">
          <span className="font-semibold text-[11px] text-hg-gold uppercase tracking-wider">{brewery}</span>
          <h2 className="text-lg text-hg-text font-bold leading-tight">{beerName}</h2>
        </LocalizedClientLink>
      </div>
      {canSeePricing && (
        <div className="col-span-2 hidden lg:flex flex-col">
          <span className="text-sm text-hg-text font-medium">{style}</span>
        </div>
      )}
      {canSeePricing && (
        <div className="col-span-1 hidden lg:flex flex-col">
          <span className="text-sm text-hg-text font-medium">{abv}</span>
        </div>
      )}
      {canSeePricing && (
        <div className="col-span-2 hidden lg:flex flex-col">
          <span className="text-sm text-hg-text font-medium">{freshness}</span>
        </div>
      )}
      <div className="col-span-1 lg:col-span-2 flex items-center justify-end gap-6 h-full">
        {canSeePricing && cheapestPrice && (
          <span className="font-bold text-lg text-hg-text">
            <PreviewPrice price={cheapestPrice} />
          </span>
        )}
        {canSeePricing && variantId && (
          <AddToCartButton variantId={variantId} />
        )}
      </div>
    </article>
  )
}
