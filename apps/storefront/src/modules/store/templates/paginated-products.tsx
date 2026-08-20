import { listProducts, listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import ProductPreview from "@modules/products/components/product-preview"
import ProductListItem from "@modules/products/components/product-list-item"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { FilterParams } from "./index"
import { sdk } from "@lib/config"
import TrackPageView from "@modules/common/components/track-page-view"
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

const MEILI_SORT_MAP: Record<string, string> = {
  created_at: "created_at_ts:desc",
  created_at_asc: "created_at_ts:asc",
  packaged_at: "packaged_at_ts:desc",
  packaged_at_asc: "packaged_at_ts:asc",
  title_asc: "title:asc",
  title_desc: "title:desc",
  abv_desc: "abv:desc",
  abv_asc: "abv:asc",
  untappd_desc: "untappd_score:desc",
  untappd_asc: "untappd_score:asc",
  stock_asc: "inventory_qty:asc",
  stock_desc: "inventory_qty:desc",
}

function buildSearchParams(
  filterParams: FilterParams,
  sortBy?: SortOptions,
): URLSearchParams {
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
  params.set("available", filterParams.available ?? "true")
  const meiliSort = sortBy ? MEILI_SORT_MAP[sortBy] : undefined
  if (meiliSort) params.set("sort", meiliSort)
  return params
}

// Fetches exactly one page of matching product ids directly from MeiliSearch
// (via /store/search), trusting its totalHits for the true count — no more
// over-fetch-then-JS-filter-then-slice. This relies on inventory_qty staying
// live in the index (see inventory-search-sync.ts), not on a client-side
// re-check against Medusa.
async function fetchSearchPage(
  filterParams: FilterParams,
  sortBy: SortOptions | undefined,
  limit: number,
  offset: number,
): Promise<{ ids: string[]; totalHits: number; usedFallback: boolean }> {
  const params = buildSearchParams(filterParams, sortBy)
  params.set("limit", String(limit))
  params.set("offset", String(offset))

  try {
    const data = await sdk.client.fetch<{ hits: any[]; totalHits: number }>(
      `/store/search?${params.toString()}`,
      { method: "GET", next: { revalidate: 0 } },
    )
    const hits = data.hits || []
    return {
      ids: hits.map((h: any) => h.id),
      totalHits: data.totalHits ?? hits.length,
      usedFallback: false,
    }
  } catch {
    // MeiliSearch itself unreachable — fall back to a full metadata scan,
    // then paginate that in memory (no real offset/limit support here).
    const allIds = await fallbackFilterByMetadata(filterParams)
    return {
      ids: allIds.slice(offset, offset + limit),
      totalHits: allIds.length,
      usedFallback: true,
    }
  }
}

// Full candidate id list (bounded by the backend's MAX_LIMIT) — still needed
// for the on_sale path, which requires a JS pass over Medusa pricing data
// that MeiliSearch doesn't index.
async function fetchAllFilteredIds(
  filterParams: FilterParams,
  sortBy?: SortOptions,
): Promise<string[]> {
  const params = buildSearchParams(filterParams, sortBy)
  params.set("limit", "300")

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

// Hydrates an exact set of product ids from Medusa (for price/variant data)
// and reorders the result to match `ids` — Medusa's id-filtered list endpoint
// does not guarantee it preserves the requested id order.
async function hydrateProductsInOrder(
  ids: string[],
  countryCode: string,
): Promise<any[]> {
  if (ids.length === 0) return []
  const {
    response: { products },
  } = await listProducts({
    pageParam: 1,
    queryParams: { id: ids, limit: ids.length } as any,
    countryCode,
  })
  const byId = new Map(products.map((p: any) => [p.id, p]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
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
  return true
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
    // Ask MeiliSearch for exactly the current page directly (real server-side
    // pagination) and trust its totalHits for the count — no more
    // over-fetch-then-JS-filter-then-slice, and no more live Medusa stock
    // re-check. This relies on inventory_qty staying live in the index (see
    // inventory-search-sync.ts) rather than working around its staleness.
    //
    // on_sale is the one exception: it needs Medusa pricing data that
    // MeiliSearch doesn't index, so it still does a JS pass over a bounded
    // candidate batch.
    const onSaleOnly = filterParams!.on_sale === "true"

    if (onSaleOnly) {
      const nonSaleParams = { ...filterParams, on_sale: undefined }
      const batchIds = await fetchAllFilteredIds(
        nonSaleParams as FilterParams,
        sortBy,
      )
      const hydrated = await hydrateProductsInOrder(batchIds, countryCode)
      const filtered = hydrated.filter((p: any) =>
        p.variants?.some((v: any) => {
          const cp = v.calculated_price
          return cp && cp.calculated_price?.price_list_type === "sale"
        }),
      )
      count = filtered.length
      const start = (page - 1) * 12
      products = filtered.slice(start, start + 12)
    } else {
      const { ids, totalHits } = await fetchSearchPage(
        filterParams!,
        sortBy,
        12,
        (page - 1) * 12,
      )
      count = totalHits
      products = await hydrateProductsInOrder(ids, countryCode)
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
      {products.length > 0 && (
        <TrackPageView
          event="product.list_viewed"
          payload={{
            list_id: collectionId
              ? `collection:${collectionId}`
              : categoryId
                ? `category:${categoryId}`
                : "store",
            product_ids: products.slice(0, 60).map((p) => p.id),
          }}
        />
      )}
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
            className={`hidden md:grid gap-8 px-4 py-2 border-b border-hg-border/50 items-center ${canSeePricing ? "grid-cols-12" : "grid-cols-12"}`}
          >
            <div className={canSeePricing ? "col-span-5" : "col-span-10"}>
              <span className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">
                Collection Details
              </span>
            </div>
            {canSeePricing && (
              <>
                <div className="col-span-2 hidden small:block">
                  <span className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">
                    Style
                  </span>
                </div>
                <div className="col-span-1 hidden medium:block">
                  <span className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">
                    ABV
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">
                    Rating
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
