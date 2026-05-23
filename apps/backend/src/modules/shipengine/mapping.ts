import {
  ShipEngineAddress,
  ShipEngineGetRatesInput,
  ShipEngineRate,
} from "./types"
import type { PackedBox } from "./packing"

export type FromAddressConfig = {
  shipping_from_name: string
  shipping_from_phone: string
  shipping_from_address_1: string
  shipping_from_city: string
  shipping_from_state: string
  shipping_from_postcode: string
  shipping_from_country: string
}

export type ShippingOptionEphemeral = {
  id: string
  name: string
  price_type: "calculated"
  amount: number
  currency_code: string
  provider_id: "shipengine"
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
  }
}

export class CurrencyMismatchError extends Error {
  constructor(public expected: string, public got: string, public rateId: string) {
    super(`Currency mismatch on rate ${rateId}: expected ${expected}, got ${got}`)
    this.name = "CurrencyMismatchError"
  }
}

/**
 * Convert a ShipEngine rate (decimal dollars) into a Medusa-compatible
 * ephemeral shipping option (integer minor units).
 */
export function rateToShippingOption(rate: ShipEngineRate, expectedCurrency: string): ShippingOptionEphemeral {
  const expected = expectedCurrency.toLowerCase()
  const got = (rate.shipping_amount?.currency ?? "").toLowerCase()
  if (got !== expected) {
    throw new CurrencyMismatchError(expected, got, rate.rate_id)
  }
  const totalDollars =
    (rate.shipping_amount?.amount ?? 0) +
    (rate.other_amount?.amount ?? 0) +
    (rate.confirmation_amount?.amount ?? 0)
  const amountMinor = Math.round(totalDollars * 100)
  const friendly = rate.carrier_friendly_name ?? rate.carrier_code
  const service = rate.service_type ?? rate.service_code
  return {
    id: `shipengine-${rate.rate_id}`,
    name: `${friendly} ${service}`.trim(),
    price_type: "calculated",
    amount: amountMinor,
    currency_code: expected,
    provider_id: "shipengine",
    data: {
      rate_id: rate.rate_id,
      carrier_id: rate.carrier_id,
      carrier_code: rate.carrier_code,
      carrier_friendly_name: rate.carrier_friendly_name,
      service_code: rate.service_code,
      service_type: rate.service_type,
      delivery_days: rate.delivery_days ?? null,
      estimated_delivery_date: rate.estimated_delivery_date ?? null,
      rate_quoted_at: new Date().toISOString(),
    },
  }
}

/**
 * Build the ShipEngine /v1/rates request body from a Medusa cart.
 */
export function cartToShipEngineShipment(args: {
  shippingAddress: {
    first_name?: string | null
    last_name?: string | null
    company?: string | null
    phone?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
    country_code?: string | null
  }
  packages: PackedBox[]
  fromAddress: FromAddressConfig
  carrierIds: string[]
  validateMode: "no_validation" | "validate_only" | "validate_and_clean"
}): ShipEngineGetRatesInput {
  const shipTo: ShipEngineAddress = {
    name: [args.shippingAddress.first_name, args.shippingAddress.last_name].filter(Boolean).join(" ") || undefined,
    company_name: args.shippingAddress.company ?? undefined,
    phone: args.shippingAddress.phone || args.fromAddress.shipping_from_phone,
    address_line1: args.shippingAddress.address_1 ?? "",
    address_line2: args.shippingAddress.address_2 ?? null,
    city_locality: args.shippingAddress.city ?? "",
    state_province: (args.shippingAddress.province ?? "").toUpperCase(),
    postal_code: args.shippingAddress.postal_code ?? "",
    country_code: (args.shippingAddress.country_code ?? "AU").toUpperCase(),
    address_residential_indicator: "yes",
  }
  const shipFrom: ShipEngineAddress = {
    name: args.fromAddress.shipping_from_name,
    phone: args.fromAddress.shipping_from_phone,
    address_line1: args.fromAddress.shipping_from_address_1,
    city_locality: args.fromAddress.shipping_from_city,
    state_province: args.fromAddress.shipping_from_state.toUpperCase(),
    postal_code: args.fromAddress.shipping_from_postcode,
    country_code: args.fromAddress.shipping_from_country.toUpperCase(),
    address_residential_indicator: "no",
  }
  return {
    rate_options: { carrier_ids: args.carrierIds },
    shipment: {
      validate_address: args.validateMode,
      ship_to: shipTo,
      ship_from: shipFrom,
      packages: args.packages.map((box) => ({
        weight: { value: Math.max(box.weightG, 1), unit: "gram" },
        dimensions: {
          unit: "centimeter",
          length: box.lengthCm,
          width: box.widthCm,
          height: box.heightCm,
        },
      })),
    },
  }
}
