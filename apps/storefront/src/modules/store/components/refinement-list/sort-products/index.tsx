"use client"

export type SortOptions =
  | "created_at"
  | "created_at_asc"
  | "packaged_at"
  | "packaged_at_asc"
  | "title_asc"
  | "title_desc"
  | "abv_desc"
  | "abv_asc"
  | "brewery_asc"
  | "brewery_desc"
  | "stock_asc"
  | "stock_desc"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: SortOptions) => void
  "data-testid"?: string
  canSeePricing?: boolean
}

const sortOptions: { label: string; value: SortOptions }[] = [
  { label: "Sort: Newest First", value: "created_at" },
  { label: "Sort: Oldest First", value: "created_at_asc" },
  { label: "Sort: Name (A-Z)", value: "title_asc" },
  { label: "Sort: Name (Z-A)", value: "title_desc" },
  { label: "Sort: ABV (High to Low)", value: "abv_desc" },
  { label: "Sort: ABV (Low to High)", value: "abv_asc" },
  { label: "Sort: Stock (Low First)", value: "stock_asc" },
  { label: "Sort: Stock (High First)", value: "stock_desc" },
]

const SortProducts = ({ sortBy, setQueryParams, "data-testid": dataTestId, canSeePricing }: SortProductsProps) => {
  if (!canSeePricing) return null

  return (
    <select
      value={sortBy}
      onChange={(e) => setQueryParams("sortBy", e.target.value as SortOptions)}
      data-testid={dataTestId}
      className="bg-hg-surface border border-hg-border text-hg-text-muted font-semibold text-[11px] rounded-[6px] focus:ring-hg-gold/20 focus:border-hg-gold px-4 py-2.5 uppercase tracking-widest h-[42px] cursor-pointer"
    >
      {sortOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export default SortProducts
