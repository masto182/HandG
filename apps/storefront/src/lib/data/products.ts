"use server"

import { sdk } from "@lib/config"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"
import { hydrateInventoryQuantity } from "./inventory"
import { hydrateProductBreweries } from "./breweries-hydrate"

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          // NOTE: `+variants.inventory_quantity` removed because Medusa
          // 2.15.2 throws "Entity 'Product' does not have property ''" on the
          // /store/products list endpoint when that virtual field is requested.
          // We hydrate inventory_quantity below via /store/inventory/by-variant-ids.
          fields: "*variants.calculated_price,*variants.images,+metadata,+tags",
          ...queryParams,
        },
        headers,
        next,
      },
    )
    .then(async ({ products, count }) => {
      // Hide future-dated drops from every storefront surface (list + PDP).
      // A product whose metadata.release_at is in the future has not yet
      // become part of the catalog — anonymous, member, and VIP all see
      // nothing. Per-tier countdowns kick in only AFTER release_at.
      const now = Date.now()
      const visible = products.filter((p) => {
        const r = (p as any).metadata?.release_at
        if (!r) return true
        const t = new Date(r).getTime()
        return Number.isFinite(t) ? t <= now : true
      })
      const hiddenCount = products.length - visible.length
      const visibleCount = Math.max(visible.length, count - hiddenCount)

      const hydrated = (await hydrateInventoryQuantity(
        visible as unknown as Parameters<typeof hydrateInventoryQuantity>[0],
      )) as unknown as HttpTypes.StoreProduct[]
      await hydrateProductBreweries(hydrated as any)
      const nextPage = visibleCount > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products: hydrated,
          count: visibleCount,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

/**
 * This will fetch 100 products to the Next.js cache and sort them based on the sortBy parameter.
 * It will then return the paginated products based on the page and limit parameters.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || 12

  const {
    response: { products, count },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: 100,
    },
    countryCode,
  })

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const nextPage = count > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count,
    },
    nextPage,
    queryParams,
  }
}
