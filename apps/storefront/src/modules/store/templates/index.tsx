import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import FilterPanel from "@modules/store/components/filter-panel"
import FilterChips from "@modules/store/components/filter-chips"
import ViewToggle from "@modules/store/components/view-toggle"
import {
  HOURS_BEFORE_PUBLIC_BY_TIER,
  type Tier,
} from "@retail-example/shared-types"

import PaginatedProducts from "./paginated-products"

export type FilterParams = {
  q?: string
  brewery?: string
  style?: string
  hops?: string
  hopsMode?: string
  freshness?: string
  collab?: string
  tags?: string
  abv?: string
  available?: string
  on_sale?: string
  hop_country?: string
}

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  canSeePricing = true,
  filterParams,
  view = "grid",
  viewerTier = null,
  earlyAccessOffsets,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  canSeePricing?: boolean
  filterParams?: FilterParams
  view?: "grid" | "list"
  viewerTier?: Tier | null
  earlyAccessOffsets?: typeof HOURS_BEFORE_PUBLIC_BY_TIER
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <main className="max-w-[1440px] mx-auto flex flex-col md:flex-row min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-[280px] flex-shrink-0 border-r border-hg-border bg-hg-surface-low">
        <div className="p-6 space-y-2">
          <FilterPanel canSeePricing={canSeePricing} />
        </div>
      </aside>

      <section className="flex-1 bg-hg-bg">
        {/* Mobile sticky controls bar */}
        <div className="sticky top-0 z-20 md:hidden bg-hg-bg/95 backdrop-blur-sm border-b border-hg-border">
          <div className="flex items-center gap-2 px-4 py-3">
            {/* Title */}
            <div className="flex-1 min-w-0">
              {filterParams?.q ? (
                <p className="text-xs font-bold text-hg-text truncate">
                  &ldquo;{filterParams.q}&rdquo;
                </p>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-hl-accent animate-pulse shrink-0" />
                  <h1 className="text-xs font-bold text-hg-text uppercase tracking-wide truncate">
                    The Collection
                  </h1>
                </div>
              )}
            </div>
            {/* Controls */}
            <FilterPanel canSeePricing={canSeePricing} mobile />
            <RefinementList sortBy={sort} canSeePricing={canSeePricing} />
            <ViewToggle />
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-6 p-8 mb-10">
          <div>
            {filterParams?.q ? (
              <>
                <p className="font-semibold text-[10px] text-hg-text-secondary tracking-widest uppercase mb-2">
                  SEARCH RESULTS
                </p>
                <h1 className="text-h2 text-hg-text">
                  &ldquo;{filterParams.q}&rdquo;
                </h1>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-hl-accent animate-pulse" />
                  <span className="font-semibold text-[10px] text-hl-accent tracking-widest uppercase">
                    NEW DROPS TODAY
                  </span>
                </div>
                <h1 className="text-h2 text-hg-text">The Collection</h1>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <ViewToggle />
            <RefinementList sortBy={sort} canSeePricing={canSeePricing} />
          </div>
        </div>

        {/* Chips + products */}
        <div className="px-4 pb-4 pt-4 md:px-8 md:pb-8 md:pt-0">
          <FilterChips />
          <Suspense
            key={JSON.stringify(filterParams)}
            fallback={<SkeletonProductGrid />}
          >
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              countryCode={countryCode}
              canSeePricing={canSeePricing}
              filterParams={filterParams}
              view={view}
              viewerTier={viewerTier}
              earlyAccessOffsets={earlyAccessOffsets}
            />
          </Suspense>
        </div>
      </section>
    </main>
  )
}

export default StoreTemplate
