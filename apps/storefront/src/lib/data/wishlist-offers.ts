import "server-only"
import { cache } from "react"
import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"

export type CustomerOfferDTO = {
  wishlist_id: string
  product_id: string
  offer_price: number
  expires_at: string | null
  promotion_code: string | null
  product: {
    id: string
    title: string
    handle: string
    thumbnail: string | null
    brewery_name: string | null
  } | null
}

/**
 * Server-only fetcher for the current customer's approved buy-at-price offers.
 * Wrapped in React `cache()` so multiple components in the same request share
 * one round-trip. Returns [] if the customer is not authenticated.
 */
export const getCustomerOffers = cache(async (): Promise<CustomerOfferDTO[]> => {
  try {
    const headers = await getAuthHeaders()
    if (!("authorization" in headers) && !("x-medusa-cache-id" in headers)) {
      return []
    }
    const res = await sdk.client.fetch<{ offers: CustomerOfferDTO[] }>(
      `/store/customers/me/wishlist/offers`,
      { method: "GET", headers, next: { revalidate: 0 } }
    )
    return res.offers || []
  } catch {
    return []
  }
})

export async function getCustomerOfferForProduct(
  productId: string
): Promise<CustomerOfferDTO | null> {
  const offers = await getCustomerOffers()
  return offers.find((o) => o.product_id === productId) || null
}
