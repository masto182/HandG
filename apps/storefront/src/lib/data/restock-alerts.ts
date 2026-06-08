import "server-only"
import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"

type RestockAlertDTO = {
  id: string
  customer_id: string
  product_id: string | null
  beer_name: string
  brewery_name: string
  notified_at: string | null
}

export async function getMyRestockAlerts(): Promise<RestockAlertDTO[]> {
  try {
    const headers = await getAuthHeaders()
    if (!("authorization" in headers) && !("x-medusa-cache-id" in headers)) {
      return []
    }
    const res = await sdk.client.fetch<{ restock_alerts: RestockAlertDTO[] }>(
      "/store/customers/me/restock-alerts",
      { method: "GET", headers, next: { revalidate: 0 } },
    )
    return res.restock_alerts ?? []
  } catch {
    return []
  }
}

/**
 * Look up an existing (unnotified) restock alert for the current customer +
 * product. Server-only — uses auth cookie. Returns null if not authenticated
 * or no alert exists.
 */
export async function getMyRestockAlertForProduct(
  productId: string,
): Promise<RestockAlertDTO | null> {
  try {
    const headers = await getAuthHeaders()
    if (!("authorization" in headers) && !("x-medusa-cache-id" in headers)) {
      // No customer session — skip the call to avoid 401 noise.
      return null
    }
    const res = await sdk.client.fetch<{ restock_alerts: RestockAlertDTO[] }>(
      `/store/customers/me/restock-alerts?product_id=${encodeURIComponent(productId)}`,
      { method: "GET", headers, next: { revalidate: 0 } },
    )
    return res.restock_alerts?.[0] ?? null
  } catch {
    return null
  }
}
