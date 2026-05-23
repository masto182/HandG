/**
 * ShipEngine API client types.
 *
 * Subset of https://www.shipengine.com/docs/ — only the fields we read or set.
 */

export type ShipEngineAddress = {
  name?: string
  phone?: string
  company_name?: string
  email?: string
  address_line1: string
  address_line2?: string | null
  address_line3?: string | null
  city_locality: string
  state_province: string
  postal_code: string
  country_code: string
  address_residential_indicator?: "yes" | "no" | "unknown"
}

export type ShipEngineWeight = {
  value: number
  unit: "ounce" | "pound" | "gram" | "kilogram"
}

export type ShipEngineDimensions = {
  unit: "inch" | "centimeter"
  length: number
  width: number
  height: number
}

export type ShipEnginePackage = {
  package_code?: string
  weight: ShipEngineWeight
  dimensions?: ShipEngineDimensions
}

export type ShipEngineMoney = {
  currency: string
  amount: number
}

export type ShipEngineService = {
  service_code: string
  name?: string
  domestic?: boolean
  international?: boolean
}

export type ShipEngineCarrier = {
  carrier_id: string
  carrier_code: string
  friendly_name: string
  account_number?: string
  primary?: boolean
  services?: ShipEngineService[]
  packages?: Array<{ package_id: string; package_code: string; name: string }>
}

export type ShipEngineRate = {
  rate_id: string
  rate_type?: string
  carrier_id: string
  carrier_code: string
  carrier_friendly_name?: string
  carrier_nickname?: string
  service_code: string
  service_type?: string
  shipping_amount: ShipEngineMoney
  insurance_amount?: ShipEngineMoney
  confirmation_amount?: ShipEngineMoney
  other_amount?: ShipEngineMoney
  delivery_days?: number | null
  estimated_delivery_date?: string | null
  guaranteed_service?: boolean
  trackable?: boolean
  package_type?: string | null
  rate_attributes?: string[]
  warning_messages?: string[]
  error_messages?: string[]
}

export type ShipEngineRateResponse = {
  rate_response: {
    rates: ShipEngineRate[]
    invalid_rates?: ShipEngineRate[]
    rate_request_id?: string
    shipment_id?: string
    status?: string
    errors?: Array<{ message: string }>
  }
  shipment_id?: string
}

export type ShipEngineGetRatesInput = {
  rate_options: {
    carrier_ids: string[]
    service_codes?: string[]
    package_types?: string[]
  }
  shipment: {
    validate_address?: "no_validation" | "validate_only" | "validate_and_clean"
    ship_to: ShipEngineAddress
    ship_from: ShipEngineAddress
    packages: ShipEnginePackage[]
  }
}

export type ShipEngineLabelDownload = {
  pdf?: string
  png?: string
  zpl?: string
  href?: string
}

export type ShipEngineLabel = {
  label_id: string
  status: string
  shipment_id: string
  ship_date?: string
  created_at?: string
  shipment_cost?: ShipEngineMoney
  insurance_cost?: ShipEngineMoney
  tracking_number?: string
  carrier_id: string
  carrier_code: string
  service_code: string
  package_code?: string
  voided?: boolean
  voided_at?: string | null
  label_format?: string
  label_layout?: string
  trackable?: boolean
  tracking_status?: string
  label_download: ShipEngineLabelDownload
}

export type ShipEngineBuyLabelInput = {
  shipment: {
    carrier_id: string
    service_code: string
    validate_address?: "no_validation" | "validate_only" | "validate_and_clean"
    ship_to: ShipEngineAddress
    ship_from: ShipEngineAddress
    packages: ShipEnginePackage[]
  }
  label_format?: "pdf" | "png" | "zpl"
  label_layout?: "4x6" | "letter"
}

export type ShipEngineTrackingEvent = {
  occurred_at: string
  carrier_occurred_at?: string
  description: string
  city_locality?: string
  state_province?: string
  postal_code?: string
  country_code?: string
  status_code?: string | null
  status_description?: string | null
  carrier_status_code?: string | null
  carrier_status_description?: string | null
}

export type ShipEngineTrackingInfo = {
  tracking_number: string
  tracking_url?: string
  status_code?: string
  status_description?: string
  carrier_code?: string
  carrier_id?: number | string
  ship_date?: string | null
  estimated_delivery_date?: string | null
  actual_delivery_date?: string | null
  exception_description?: string | null
  events: ShipEngineTrackingEvent[]
}

export interface ShipEngineLikeClient {
  getRates(input: ShipEngineGetRatesInput): Promise<ShipEngineRateResponse>
  buyLabelFromRate(rateId: string, opts?: { label_format?: string; label_layout?: string }): Promise<ShipEngineLabel>
  buyLabel(input: ShipEngineBuyLabelInput): Promise<ShipEngineLabel>
  voidLabel(labelId: string): Promise<{ approved: boolean; message?: string }>
  trackByLabel(labelId: string): Promise<ShipEngineTrackingInfo>
  listCarriers(): Promise<ShipEngineCarrier[]>
}

export class ShipEngineApiError extends Error {
  status: number
  code?: string
  request_id?: string
  details?: unknown

  constructor(status: number, message: string, opts?: { code?: string; request_id?: string; details?: unknown }) {
    super(message)
    this.name = "ShipEngineApiError"
    this.status = status
    this.code = opts?.code
    this.request_id = opts?.request_id
    this.details = opts?.details
  }
}
