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
  { label: "Newest First", value: "created_at" },
  { label: "Oldest First", value: "created_at_asc" },
  { label: "Name A–Z", value: "title_asc" },
  { label: "Name Z–A", value: "title_desc" },
  { label: "ABV High–Low", value: "abv_desc" },
  { label: "ABV Low–High", value: "abv_asc" },
  { label: "Stock Low First", value: "stock_asc" },
  { label: "Stock High First", value: "stock_desc" },
]

const SortProducts = ({
  sortBy,
  setQueryParams,
  "data-testid": dataTestId,
  canSeePricing,
}: SortProductsProps) => {
  if (!canSeePricing) return null

  return (
    <select
      value={sortBy}
      onChange={(e) => setQueryParams("sortBy", e.target.value as SortOptions)}
      data-testid={dataTestId}
      className="bg-hg-surface border border-hg-border text-hg-text-muted font-semibold text-[11px] rounded-md focus:ring-hg-gold/20 focus:border-hg-gold px-3 py-2 uppercase tracking-widest h-[36px] md:h-[42px] md:px-4 md:py-2.5 cursor-pointer"
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
