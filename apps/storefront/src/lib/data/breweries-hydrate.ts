import { sdk } from "@lib/config"

export type LinkedBrewery = {
  id: string
  slug: string
  name: string
}

type ProductWithBreweries = {
  id?: string
  breweries?: LinkedBrewery[]
  [k: string]: any
}

async function getBreweriesByProduct(
  ids: string[],
): Promise<Record<string, LinkedBrewery[]>> {
  if (!ids.length) return {}
  try {
    const data = await sdk.client.fetch<{
      breweries_by_product: Record<string, LinkedBrewery[]>
    }>("/store/products/breweries", {
      method: "GET",
      query: { ids: ids.join(",") },
    })
    return data?.breweries_by_product || {}
  } catch {
    return {}
  }
}

/**
 * Mutates each product in the list to include a `breweries` array
 * (linked breweries). Safe no-op on failure.
 */
export async function hydrateProductBreweries<T extends ProductWithBreweries>(
  products: T[],
): Promise<T[]> {
  const ids = products
    .map((p) => p.id)
    .filter((id): id is string => Boolean(id))
  if (!ids.length) return products
  const map = await getBreweriesByProduct(ids)
  for (const p of products) {
    if (p.id && map[p.id]) {
      p.breweries = map[p.id]
    } else if (p.id) {
      p.breweries = p.breweries || []
    }
  }
  return products
}
