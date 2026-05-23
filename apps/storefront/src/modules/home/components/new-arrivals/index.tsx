import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import AddToCartButton from "@modules/products/components/product-list-item/add-to-cart-button"
import { getProductPrice } from "@lib/util/get-product-price"

type NewArrivalsProps = {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
  canSeePricing?: boolean
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

function isCollab(product: HttpTypes.StoreProduct): boolean {
  const meta = product.metadata as any
  return meta?.is_collab === true || meta?.is_collab === "true"
}

function isAnniversary(product: HttpTypes.StoreProduct): boolean {
  const tagValues = (product.tags || []).map((t) => (t.value || "").toLowerCase())
  return tagValues.includes("anniversary")
}

function getStock(product: HttpTypes.StoreProduct): number {
  if (!product.variants) return 0
  return product.variants.reduce((sum, v: any) => sum + (v.inventory_quantity ?? 0), 0)
}

const NewArrivals = ({ products, region, canSeePricing = true }: NewArrivalsProps) => {
  if (!products?.length) return null

  return (
    <section className="py-16 bg-[var(--color-bg)]">
      <div className="max-w-[1440px] mx-auto px-6 mb-6 flex justify-between items-end">
        <div>
          <span className="text-hg-gold text-xs font-semibold uppercase tracking-[0.15em] mb-1 block">
            Current Selection
          </span>
          <h2 className="text-h2 text-hg-text">
            New Arrivals
          </h2>
        </div>
        <div className="flex gap-2">
          <button className="w-10 h-10 flex items-center justify-center border border-hg-border rounded-full text-hg-text hover:bg-hg-surface transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button className="w-10 h-10 flex items-center justify-center border border-hg-border rounded-full text-hg-text hover:bg-hg-surface transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
      <div className="flex gap-6 overflow-x-auto no-scrollbar px-6 pb-6 max-w-[1440px] mx-auto">
        {products.slice(0, 8).map((product) => {
          const brewery = getBreweryName(product)
          const beerName = getBeerName(product)
          const style = getStyle(product)
          const abv = getAbv(product)
          const collab = isCollab(product)
          const anniversary = isAnniversary(product)
          const stock = getStock(product)
          const soldOut = stock === 0
          const { cheapestPrice } = getProductPrice({ product })
          const variantId = product.variants?.[0]?.id

          return (
            <div key={product.id} className="min-w-[280px] max-w-[300px] bg-[var(--color-surface)] border border-hg-border rounded-xl overflow-hidden group flex flex-col">
              <LocalizedClientLink href={`/products/${product.handle}`}>
                <div className="aspect-square bg-[var(--color-surface-2)] flex items-center justify-center relative overflow-hidden">
                  <div className="h-full w-full group-hover:scale-110 transition-transform duration-500">
                    <Thumbnail
                      thumbnail={product.thumbnail}
                      images={product.images}
                      size="full"
                    />
                  </div>
                  {anniversary && (
                    <div className="absolute top-2 right-2 bg-hg-gold text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ring-2 ring-[var(--color-bg)]">
                      Anniversary
                    </div>
                  )}
                  {collab && !anniversary && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-black px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ring-2 ring-[var(--color-bg)]">
                      Collab
                    </div>
                  )}
                </div>
              </LocalizedClientLink>
              <div className="p-4 flex flex-col flex-grow">
                {brewery && (
                  <span className="text-[10px] font-semibold text-hg-gold uppercase tracking-[0.12em] mb-1">
                    {brewery}
                  </span>
                )}
                <LocalizedClientLink href={`/products/${product.handle}`}>
                  <h3 className="text-base font-semibold text-hg-text leading-tight capitalize mb-1">{beerName}</h3>
                </LocalizedClientLink>
                {(style || abv) && (
                  <span className="text-[11px] text-hg-text-secondary mb-3">
                    {style}{style && abv ? " · " : ""}{abv}
                  </span>
                )}
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-hg-border/30">
                  {canSeePricing && cheapestPrice ? (
                    <span className="text-lg font-bold text-hg-text">
                      {cheapestPrice.calculated_price}
                    </span>
                  ) : (
                    <span className="text-xs text-hg-text-secondary uppercase tracking-wider">
                      {canSeePricing ? "" : "Members Only"}
                    </span>
                  )}
                  {soldOut ? (
                    <span className="px-4 py-2 bg-hg-surface-dim text-hg-text-secondary text-[11px] font-bold rounded-lg uppercase tracking-wider">
                      Sold Out
                    </span>
                  ) : variantId ? (
                    <AddToCartButton variantId={variantId} />
                  ) : (
                    <LocalizedClientLink
                      href={`/products/${product.handle}`}
                      className="px-4 py-2 border border-hg-border text-hg-text text-[11px] font-bold uppercase tracking-wider rounded-lg text-center hover:bg-hg-gold hover:text-white hover:border-hg-gold transition-all"
                    >
                      View
                    </LocalizedClientLink>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default NewArrivals
