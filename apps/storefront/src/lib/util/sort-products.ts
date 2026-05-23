import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

function getBeerName(title: string | null | undefined): string {
  if (!title) return ""
  const sep = title.indexOf(" — ")
  return sep === -1 ? title : title.slice(sep + 3)
}

export function sortProducts(
  products: HttpTypes.StoreProduct[],
  sortBy: SortOptions
): HttpTypes.StoreProduct[] {
  const sorted = [...products]

  switch (sortBy) {
    case "created_at":
      return sorted.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
    case "created_at_asc":
      return sorted.sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime())
    case "title_asc":
      return sorted.sort((a, b) => getBeerName(a.title).localeCompare(getBeerName(b.title)))
    case "title_desc":
      return sorted.sort((a, b) => getBeerName(b.title).localeCompare(getBeerName(a.title)))
    case "abv_desc":
      return sorted.sort((a, b) => parseFloat((b.metadata as any)?.abv || "0") - parseFloat((a.metadata as any)?.abv || "0"))
    case "abv_asc":
      return sorted.sort((a, b) => parseFloat((a.metadata as any)?.abv || "0") - parseFloat((b.metadata as any)?.abv || "0"))
    case "brewery_asc":
      return sorted.sort((a, b) => ((a.metadata as any)?.brewery_name || (a.metadata as any)?.brewery || "").localeCompare((b.metadata as any)?.brewery_name || (b.metadata as any)?.brewery || ""))
    case "brewery_desc":
      return sorted.sort((a, b) => ((b.metadata as any)?.brewery_name || (b.metadata as any)?.brewery || "").localeCompare((a.metadata as any)?.brewery_name || (a.metadata as any)?.brewery || ""))
    case "packaged_at":
      return sorted.sort((a, b) => new Date((b.metadata as any)?.released_date || (b.metadata as any)?.packaged_at || 0).getTime() - new Date((a.metadata as any)?.released_date || (a.metadata as any)?.packaged_at || 0).getTime())
    case "packaged_at_asc":
      return sorted.sort((a, b) => new Date((a.metadata as any)?.released_date || (a.metadata as any)?.packaged_at || 0).getTime() - new Date((b.metadata as any)?.released_date || (b.metadata as any)?.packaged_at || 0).getTime())
    case "stock_asc":
      return sorted.sort((a, b) => (a.variants?.reduce((s: number, v: any) => s + (v.inventory_quantity ?? 0), 0) ?? 999) - (b.variants?.reduce((s: number, v: any) => s + (v.inventory_quantity ?? 0), 0) ?? 999))
    case "stock_desc":
      return sorted.sort((a, b) => (b.variants?.reduce((s: number, v: any) => s + (v.inventory_quantity ?? 0), 0) ?? 0) - (a.variants?.reduce((s: number, v: any) => s + (v.inventory_quantity ?? 0), 0) ?? 0))
    default:
      return sorted
  }
}
