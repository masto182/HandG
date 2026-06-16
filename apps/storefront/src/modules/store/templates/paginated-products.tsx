import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import ProductPreview from "@modules/products/components/product-preview"
import ProductListItem from "@modules/products/components/product-list-item"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { FilterParams } from "./index"
import { sdk } from "@lib/config"
import {
  HOURS_BEFORE_PUBLIC_BY_TIER,
  type Tier,
} from "@retail-example/shared-types"

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
}

async function fetchFilteredProductIds(
  filterParams: FilterParams,
): Promise<string[]> {
  const params = new URLSearchParams()
  if (filterParams.q) params.set("q", filterParams.q)
  if (filterParams.brewery) params.set("brewery", filterParams.brewery)
  if (filterParams.style) params.set("style", filterParams.style)
  if (filterParams.hops) params.set("hops", filterParams.hops)
  if (filterParams.hopsMode) params.set("hopsMode", filterParams.hopsMode)
  if (filterParams.freshness) params.set("freshness", filterParams.freshness)
  if (filterParams.collab) params.set("collab", filterParams.collab)
  if (filterParams.tags) params.set("tags", filterParams.tags)
  if (filterParams.abv) params.set("abv", filterParams.abv)
  if (filterParams.hop_country)
    params.set("hop_country", filterParams.hop_country)
  params.set("limit", "200")

  try {
    const data = await sdk.client.fetch<{ hits: any[] }>(
      `/store/search?${params.toString()}`,
      { method: "GET", next: { revalidate: 0 } },
    )
    const hits = data.hits || []
    if (hits.length > 0) {
      return hits.map((h: any) => h.id)
    }
  } catch {}

  return fallbackFilterByMetadata(filterParams)
}

async function fallbackFilterByMetadata(
  filterParams: FilterParams,
): Promise<string[]> {
  try {
    const data = await sdk.client.fetch<{ products: any[] }>(
      // +variants.inventory_quantity removed (Medusa 2.15.2 list-endpoint bug);
      // the `available` filter falls back to "stock = 1 unknown" when the
      // field is absent, which is the safe default (don't hide products).
      "/store/products?limit=200&fields=id,handle,metadata,+metadata,+tags,*variants.id",
      { method: "GET", cache: "no-store" },
    )
    const products: any[] = data.products || []

    return products
      .filter((p) => {
        const meta = p.metadata || {}

        if (filterParams.q) {
          const q = filterParams.q.toLowerCase()
          const title = (p.title || "").toLowerCase()
          const desc = (p.description || "").toLowerCase()
          const brewery = (
            meta.brewery_name ||
            meta.brewery ||
            ""
          ).toLowerCase()
          if (!title.includes(q) && !desc.includes(q) && !brewery.includes(q))
            return false
        }

        if (filterParams.brewery) {
          const breweries = filterParams.brewery
            .split(",")
            .map((b: string) => b.toLowerCase())
          const productBrewery = (
            meta.brewery_name ||
            meta.brewery ||
            ""
          ).toLowerCase()
          if (
            !breweries.some(
              (b: string) => productBrewery === b || productBrewery.includes(b),
            )
          )
            return false
        }

        // Style filter intentionally not applied in the metadata-fallback path:
        // family rollup (e.g. "IPA", "Dark") cannot be reliably resolved from
        // free-text metadata.style. Meili (primary path) handles style_family.

        if (filterParams.freshness) {
          const bands = filterParams.freshness.split(",")
          const released = meta.released_date
          if (!released) return false
          const daysAgo = Math.floor(
            (Date.now() - new Date(released).getTime()) / (1000 * 60 * 60 * 24),
          )
          const matchesBand = bands.some((band: string) => {
            const [min, max] = band.split("-").map(Number)
            if (max) return daysAgo >= min && daysAgo <= max
            return daysAgo >= min
          })
          if (!matchesBand) return false
        }

        if (filterParams.abv) {
          const ranges = filterParams.abv.split(",")
          const abv = parseFloat(meta.abv || "0")
          const matchesAbv = ranges.some((range: string) => {
            if (range.endsWith("+")) return abv >= parseFloat(range)
            const [min, max] = range.split("-").map(Number)
            return abv >= min && abv < max
          })
          if (!matchesAbv) return false
        }

        if (
          filterParams.collab === "true" &&
          !(
            Array.isArray((p as any).breweries) &&
            (p as any).breweries.length > 1
          )
        )
          return false

        if (filterParams.tags) {
          const wantedTags = filterParams.tags
            .split(",")
            .map((t: string) => t.toLowerCase())
          const productTags: string[] = (
            Array.isArray((p as any).tags) ? (p as any).tags : []
          )
            .map((t: any) => (t.value || "").toLowerCase())
            .filter(Boolean)
          if (!wantedTags.every((wt: string) => productTags.includes(wt)))
            return false
        }

        if (filterParams.on_sale === "true") {
          const hasSalePrice = p.variants?.some((v: any) => {
            const cp = v.calculated_price
            return cp && cp.calculated_price?.price_list_type === "sale"
          })
          if (!hasSalePrice) return false
        }

        if (filterParams.available !== "false") {
          const stock =
            p.variants?.reduce(
              (sum: number, v: any) => sum + (v.inventory_quantity ?? 0),
              0,
            ) ?? 1
          if (stock <= 0) return false
        }

        return true
      })
      .map((p) => p.id)
  } catch {
    return []
  }
}

function hasActiveFilters(filterParams?: FilterParams): boolean {
  if (!filterParams) return false
  return !!(
    filterParams.q ||
    filterParams.brewery ||
    filterParams.style ||
    filterParams.hops ||
    filterParams.freshness ||
    filterParams.collab ||
    filterParams.tags ||
    filterParams.abv ||
    filterParams.on_sale ||
    filterParams.hop_country
  )
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  countryCode,
  canSeePricing = true,
  filterParams,
  view = "grid",
  viewerTier = null,
  earlyAccessOffsets,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  countryCode: string
  canSeePricing?: boolean
  filterParams?: FilterParams
  view?: "grid" | "list"
  viewerTier?: Tier | null
  earlyAccessOffsets?: typeof HOURS_BEFORE_PUBLIC_BY_TIER
}) {
  const queryParams: PaginatedProductsParams = {
    limit: 12,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryId) {
    queryParams["category_id"] = [categoryId]
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  let products: any[]
  let count: number

  if (hasActiveFilters(filterParams)) {
    // When filters are active, use MeiliSearch (or metadata fallback) to get all
    // matching product IDs. Then fetch only the current page slice from Medusa.
    // This replaces the previous limit:200 over-fetch + JS filter approach.
    //
    // on_sale requires pricing data that only Medusa returns — it is handled as
    // a post-fetch pass so we over-fetch one extra page when on_sale is active.
    const onSaleOnly = filterParams!.on_sale === "true"
    const nonSaleParams = onSaleOnly
      ? { ...filterParams, on_sale: undefined }
      : filterParams

    const allIds = await fetchFilteredProductIds(nonSaleParams!)

    if (allIds.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-hg-text-secondary/30 mb-4"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <h3 className="text-lg font-semibold text-hg-text mb-2">
            No products found
          </h3>
          <p className="text-sm text-hg-text-secondary max-w-xs">
            Try adjusting your filters or search terms to find what you&apos;re
            looking for.
          </p>
        </div>
      )
    }

    if (onSaleOnly) {
      // Fetch up to 200 products matching the other filters, then JS-filter for on_sale.
      const batchIds = allIds.slice(0, 200)
      const { response: batch } = await listProductsWithSort({
        page: 1,
        queryParams: { ...queryParams, limit: 200, id: batchIds } as any,
        sortBy,
        countryCode,
      })
      const filtered = batch.products.filter((p: any) =>
        p.variants?.some((v: any) => {
          const cp = v.calculated_price
          return cp && cp.calculated_price?.price_list_type === "sale"
        }),
      )
      count = filtered.length
      const start = (page - 1) * 12
      products = filtered.slice(start, start + 12)
    } else {
      // Use the full ID list for accurate count + proper pagination.
      count = allIds.length
      const pageIds = allIds.slice((page - 1) * 12, page * 12)
      if (pageIds.length === 0) {
        products = []
      } else {
        const { response: pageResult } = await listProductsWithSort({
          page: 1,
          queryParams: { ...queryParams, limit: 12, id: pageIds } as any,
          sortBy,
          countryCode,
        })
        products = pageResult.products
      }
    }
  } else {
    const result = await listProductsWithSort({
      page,
      queryParams,
      sortBy,
      countryCode,
    })
    products = result.response.products
    count = result.response.count
  }

  const totalPages = Math.ceil(count / 12)

  return (
    <>
      <p className="text-xs text-hg-text-muted uppercase tracking-widest mb-4">
        {count}{" "}
        {canSeePricing
          ? count === 1
            ? "beer"
            : "beers"
          : count === 1
            ? "release"
            : "releases"}{" "}
        found
      </p>
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-hg-text-secondary/30 mb-4"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <h3 className="text-lg font-semibold text-hg-text mb-2">
            No products found
          </h3>
          <p className="text-sm text-hg-text-secondary max-w-xs">
            Try adjusting your filters or search terms to find what you&apos;re
            looking for.
          </p>
        </div>
      ) : view === "list" ? (
        <div
          className="flex flex-col border-t border-hg-border w-full"
          data-testid="products-list"
        >
          <div
            className={`hidden lg:grid gap-8 px-4 py-2 border-b border-hg-border/50 items-center ${canSeePricing ? "grid-cols-12" : "grid-cols-12"}`}
          >
            <div className={canSeePricing ? "col-span-5" : "col-span-10"}>
              <span className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">
                Collection Details
              </span>
            </div>
            {canSeePricing && (
              <>
                <div className="col-span-2">
                  <span className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">
                    Style
                  </span>
                </div>
                <div className="col-span-1">
                  <span className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">
                    ABV
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">
                    Freshness
                  </span>
                </div>
              </>
            )}
            <div className="col-span-2 flex justify-end pr-[90px]">
              {canSeePricing && (
                <span className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">
                  Price
                </span>
              )}
            </div>
          </div>
          {products.map((p) => (
            <ProductListItem
              key={p.id}
              product={p}
              region={region}
              canSeePricing={canSeePricing}
              viewerTier={viewerTier}
              earlyAccessOffsets={earlyAccessOffsets}
            />
          ))}
        </div>
      ) : (
        <ul
          className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-3 gap-y-8 small:gap-x-6 small:gap-y-10 w-full"
          data-testid="products-list"
        >
          {products.map((p) => (
            <li key={p.id}>
              <ProductPreview
                product={p}
                region={region}
                canSeePricing={canSeePricing}
                viewerTier={viewerTier}
                earlyAccessOffsets={earlyAccessOffsets}
              />
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )
}
