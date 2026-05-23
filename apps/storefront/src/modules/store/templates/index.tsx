import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import FilterPanel from "@modules/store/components/filter-panel"
import FilterChips from "@modules/store/components/filter-chips"
import ViewToggle from "@modules/store/components/view-toggle"

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
}

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  canSeePricing = true,
  filterParams,
  view = "grid",
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  canSeePricing?: boolean
  filterParams?: FilterParams
  view?: "grid" | "list"
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <main className="max-w-[1440px] mx-auto flex flex-col md:flex-row min-h-screen">
      <aside className="hidden md:block w-[280px] flex-shrink-0 border-r border-hg-border bg-hg-surface-low">
        <div className="p-6 space-y-2">
          <FilterPanel canSeePricing={canSeePricing} />
        </div>
      </aside>
      <div className="md:hidden">
        <FilterPanel canSeePricing={canSeePricing} />
      </div>
      <section className="flex-1 p-6 md:p-8 bg-hg-bg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            {filterParams?.q ? (
              <>
                <p className="font-semibold text-[10px] text-hg-text-secondary tracking-widest uppercase mb-2">SEARCH RESULTS</p>
                <h1 className="text-h2 text-hg-text">
                  &ldquo;{filterParams.q}&rdquo;
                </h1>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-hl-accent animate-pulse" />
                  <span className="font-semibold text-[10px] text-hl-accent tracking-widest uppercase">NEW DROPS TODAY</span>
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
        <FilterChips />
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
            canSeePricing={canSeePricing}
            filterParams={filterParams}
            view={view}
          />
        </Suspense>
      </section>
    </main>
  )
}

export default StoreTemplate
