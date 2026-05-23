import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

type RelatedProductsProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
  canSeePricing?: boolean
}

export default async function RelatedProducts({
  product,
  countryCode,
  canSeePricing = true,
}: RelatedProductsProps) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const queryParams: HttpTypes.StoreProductListParams = {}
  if (region?.id) {
    queryParams.region_id = region.id
  }
  if (product.collection_id) {
    queryParams.collection_id = [product.collection_id]
  }
  if (product.tags) {
    queryParams.tag_id = product.tags
      .map((t) => t.id)
      .filter(Boolean) as string[]
  }
  queryParams.is_giftcard = false

  const products = await listProducts({
    queryParams,
    countryCode,
  }).then(({ response }) => {
    return response.products.filter(
      (responseProduct) => responseProduct.id !== product.id
    )
  })

  if (!products.length) {
    return null
  }

  return (
    <section className="mt-24">
      <div className="flex justify-between items-end mb-8">
        <h2 className="text-h2 text-hg-text uppercase">
          MEMBERS ALSO BOUGHT
        </h2>
        <LocalizedClientLink
          href="/store"
          className="text-hl-primary font-semibold text-label-caps uppercase hover:underline"
        >
          View All Collection
        </LocalizedClientLink>
      </div>
      <div className="flex overflow-x-auto gap-6 no-scrollbar pb-8 -mx-6 px-6">
        {products.slice(0, 6).map((p) => {
          const meta = p.metadata as Record<string, any> | null
          const breweryName = meta?.brewery_name || meta?.brewery
          const abv = canSeePricing ? meta?.abv : null
          const stockRemaining = p.variants?.reduce((sum: number, v: any) => sum + (v.inventory_quantity ?? 0), 0) ?? 0
          const price = p.variants?.[0]?.calculated_price?.calculated_amount
          const currencyCode = p.variants?.[0]?.calculated_price?.currency_code || "aud"

          const formattedPrice = price != null
            ? new Intl.NumberFormat("en-AU", { style: "currency", currency: currencyCode }).format(price)
            : null

          return (
            <LocalizedClientLink
              key={p.id}
              href={`/products/${p.handle}`}
              className="min-w-[300px] bg-hg-surface rounded-xl border border-hg-border/20 overflow-hidden group flex-shrink-0"
            >
              <div className="aspect-square relative overflow-hidden bg-hg-surface-dim">
                {p.thumbnail ? (
                  <Image
                    src={p.thumbnail}
                    alt={p.title || "Product"}
                    fill
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="300px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-hg-text-muted/20">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
                <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${stockRemaining <= 0 ? "bg-red-400" : stockRemaining <= 5 ? "bg-hl-accent animate-pulse" : "bg-hl-accent"}`} />
              </div>
              <div className="p-6">
                {breweryName && (
                  <span className="text-label-caps text-hl-primary uppercase mb-1 block">
                    {breweryName}
                  </span>
                )}
                <h4 className="font-semibold text-body-md text-hg-text mb-3 capitalize">
                  {p.title}
                </h4>
                <div className="flex justify-between items-center">
                  {canSeePricing && formattedPrice && (
                    <span className="text-price text-hl-price">{formattedPrice}</span>
                  )}
                  {abv && (
                    <span className="text-hg-text-muted text-body-sm">{abv}% ABV</span>
                  )}
                </div>
              </div>
            </LocalizedClientLink>
          )
        })}
      </div>
    </section>
  )
}
