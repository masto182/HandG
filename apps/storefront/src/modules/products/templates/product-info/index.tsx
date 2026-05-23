import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
  canSeePricing?: boolean
}

const ProductInfo = ({ product, canSeePricing = true }: ProductInfoProps) => {
  const metadata = product.metadata as Record<string, any> | null
  const breweryName = metadata?.brewery_name || metadata?.brewery
  const brewerySlug = metadata?.brewery_slug
  const isCollab = metadata?.is_collab === true || metadata?.is_collab === "true"
  const collabNote = metadata?.collab_note || metadata?.comment
  const collabPartner = metadata?.collab_partner
  const isAnniversary = !!(collabNote && /anniversar/i.test(collabNote))
  const untappdRating = canSeePricing ? (metadata?.untappd_rating || metadata?.untappd_score) : null
  const releasedDate = metadata?.released_date
  const stockRemaining = canSeePricing
    ? product.variants?.reduce((sum: number, v: any) => sum + (v.inventory_quantity ?? 0), 0) ?? null
    : null

  const formattedDate = releasedDate ? (() => {
    const d = new Date(releasedDate)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
  })() : null

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          {isCollab && (
            <span className="bg-hl-accent-soft text-hl-accent px-3 py-1 rounded-full font-semibold text-label-caps uppercase">
              Collaboration
            </span>
          )}
          {isAnniversary && (
            <span className="bg-red-400/20 text-red-400 px-3 py-1 rounded-full font-semibold text-label-caps uppercase">
              Anniversary
            </span>
          )}
        </div>
        <h1 className="text-h1 text-hg-text uppercase mb-2">
          {product.title}
        </h1>
        {breweryName && (
          <LocalizedClientLink
            href={brewerySlug ? `/breweries/${brewerySlug}` : `/breweries/${breweryName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            className="text-[18px] leading-[1.6] text-hl-primary tracking-tight font-semibold"
          >
            {breweryName}
          </LocalizedClientLink>
        )}
        {isCollab && collabPartner && (
          <div className="mt-1 flex items-center gap-2 text-hg-text-secondary text-[14px]">
            <span className="text-[12px] italic">Collab with:</span>
            <span className="text-hl-accent hover:underline font-semibold">{collabPartner}</span>
          </div>
        )}
      </div>

      {canSeePricing && (
        <div className="flex items-end gap-4">
          <span className="text-4xl font-bold text-hl-primary" data-testid="product-price-display">
          </span>
          {stockRemaining !== null && stockRemaining !== undefined && (
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-2 h-2 rounded-full ${Number(stockRemaining) <= 5 ? "bg-hl-accent animate-pulse" : "bg-hl-accent"}`} />
              <span className="font-semibold text-[12px] uppercase tracking-[0.05em] text-hg-text-secondary">
                {Number(stockRemaining) <= 0
                  ? "Sold Out"
                  : Number(stockRemaining) <= 10
                    ? `Low Stock: ${stockRemaining} Units Remaining`
                    : `${stockRemaining} In Stock`}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        {untappdRating && (
          <div className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/30 px-2 py-1 rounded">
            <span className="text-yellow-400 font-bold text-xs">{untappdRating}</span>
            <span className="text-hg-text-secondary text-[10px] uppercase font-bold tracking-wider">Untappd</span>
          </div>
        )}
        {formattedDate && (
          <div className="text-hg-text-secondary text-[10px] uppercase font-bold tracking-wider flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Canned: {formattedDate}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductInfo
