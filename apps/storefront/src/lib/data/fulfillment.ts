"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { isStaleCartError } from "@lib/util/medusa-error"
import { getAuthHeaders, getCacheOptions } from "./cookies"

export type CarrierGroup = "australia_post" | "couriers_please" | "aramex" | "other"
export type ServiceTier = "standard" | "express"
export type DeliveryBehaviour = "attempted" | "leave_at_door" | "signature"

export type CarrierRate = {
  id: string
  name: string
  amount: number
  currency_code: string
  price_type: "calculated"
  provider_id: string
  // v2 enrichment fields
  carrier_group: CarrierGroup
  carrier_display_name: string
  service_tier: ServiceTier
  delivery_behaviour: DeliveryBehaviour
  is_default_behaviour: boolean
  // v3 sibling pointer (present on non-signature rows that have a paired signature variant)
  signature_sibling?: {
    rate_id: string
    amount: number
    delta_cents: number
  }
  data: {
    rate_id: string
    carrier_id: string
    carrier_code: string
    carrier_friendly_name?: string
    service_code: string
    service_type?: string
    delivery_days?: number | null
    estimated_delivery_date?: string | null
    rate_quoted_at: string
    cover_total_aud?: number
  }
}

export type CarrierRateGroup = {
  carrier_group: CarrierGroup
  carrier_display_name: string
  rates: CarrierRate[]
}

export type CarrierRatesResponse = {
  rates: CarrierRate[]
  groups: CarrierRateGroup[]
  best_price_rate_id: string | null
  carrier_unavailable: CarrierGroup[]
  require_signature: boolean
}

export async function getCarrierRates(
  cartId: string,
  opts?: { requireSignature?: boolean },
): Promise<CarrierRatesResponse> {
  const empty: CarrierRatesResponse = {
    rates: [],
    groups: [],
    best_price_rate_id: null,
    carrier_unavailable: [],
    require_signature: !!opts?.requireSignature,
  }
  if (!cartId) return empty
  const headers = { ...(await getAuthHeaders()) }
  const query: Record<string, string> = { cart_id: cartId }
  if (opts?.requireSignature) query.require_signature = "true"
  return sdk.client
    .fetch<CarrierRatesResponse>(`/store/shipping/rates`, {
      method: "GET",
      query,
      headers,
      cache: "no-store",
    })
    .then((res) => ({
      rates: res?.rates ?? [],
      groups: res?.groups ?? [],
      best_price_rate_id: res?.best_price_rate_id ?? null,
      carrier_unavailable: res?.carrier_unavailable ?? [],
      require_signature: res?.require_signature ?? !!opts?.requireSignature,
    }))
    .catch(() => empty)
}

export const listCartShippingMethods = async (cartId: string) => {
  if (!cartId) return null

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("fulfillment")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreShippingOptionListResponse>(
      `/store/shipping-options`,
      {
        method: "GET",
        query: { cart_id: cartId, fields: "+service_zone.fulfillment_set.type,+type.code" },
        headers,
        next,
        cache: "no-store",
      }
    )
    .then(({ shipping_options }) => {
      return shipping_options
    })
    .catch((e) => {
      // Stale cart references (cart deleted server-side, cookie still in
      // browser) are recoverable on the next mutation — don't pollute logs.
      if (!isStaleCartError(e)) {
        console.error("[Fulfillment] listCartShippingMethods error:", e?.message ?? e)
      }
      return null
    })
}

export const calculatePriceForShippingOption = async (
  optionId: string,
  cartId: string,
  data?: Record<string, unknown>
) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("fulfillment")),
  }

  const body = { cart_id: cartId, data }

  if (data) {
    body.data = data
  }

  return sdk.client
    .fetch<{ shipping_option: HttpTypes.StoreCartShippingOption }>(
      `/store/shipping-options/${optionId}/calculate`,
      {
        method: "POST",
        body,
        headers,
        next,
      }
    )
    .then(({ shipping_option }) => shipping_option)
    .catch((_e) => {
      return null
    })
}
