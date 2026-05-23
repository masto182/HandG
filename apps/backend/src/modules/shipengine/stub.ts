import {
  ShipEngineBuyLabelInput,
  ShipEngineCarrier,
  ShipEngineGetRatesInput,
  ShipEngineLabel,
  ShipEngineLikeClient,
  ShipEngineRate,
  ShipEngineRateResponse,
  ShipEngineTrackingInfo,
} from "./types"

const STUB_CARRIER_AUSPOST: ShipEngineCarrier = {
  carrier_id: "se-stub-auspost",
  carrier_code: "australia_post",
  friendly_name: "Australia Post (stub)",
  primary: true,
  services: [
    { service_code: "australia_post_parcel_post", name: "Parcel Post", domestic: true, international: false },
    { service_code: "australia_post_express_post", name: "Express Post", domestic: true, international: false },
  ],
}

const STUB_CARRIER_COURIERSPLEASE: ShipEngineCarrier = {
  carrier_id: "se-stub-couriersplease",
  carrier_code: "couriers_please",
  friendly_name: "CouriersPlease (stub)",
  primary: false,
  services: [
    { service_code: "couriers_please_metro", name: "Metro", domestic: true, international: false },
    { service_code: "couriers_please_road", name: "Road Express", domestic: true, international: false },
  ],
}

function buildStubRates(currency: string): ShipEngineRate[] {
  const today = new Date()
  const eta = (days: number) =>
    new Date(today.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
  return [
    {
      rate_id: "stub-auspost-parcel",
      carrier_id: STUB_CARRIER_AUSPOST.carrier_id,
      carrier_code: "australia_post",
      carrier_friendly_name: "Australia Post",
      service_code: "australia_post_parcel_post",
      service_type: "Parcel Post",
      shipping_amount: { currency, amount: 12.0 },
      delivery_days: 4,
      estimated_delivery_date: eta(4),
      trackable: true,
      rate_attributes: ["cheapest"],
    },
    {
      rate_id: "stub-auspost-express",
      carrier_id: STUB_CARRIER_AUSPOST.carrier_id,
      carrier_code: "australia_post",
      carrier_friendly_name: "Australia Post",
      service_code: "australia_post_express_post",
      service_type: "Express Post",
      shipping_amount: { currency, amount: 20.0 },
      delivery_days: 2,
      estimated_delivery_date: eta(2),
      trackable: true,
      rate_attributes: ["fastest"],
    },
    {
      rate_id: "stub-cp-metro",
      carrier_id: STUB_CARRIER_COURIERSPLEASE.carrier_id,
      carrier_code: "couriers_please",
      carrier_friendly_name: "CouriersPlease",
      service_code: "couriers_please_metro",
      service_type: "Metro",
      shipping_amount: { currency, amount: 11.0 },
      delivery_days: 3,
      estimated_delivery_date: eta(3),
      trackable: true,
      rate_attributes: ["cheapest", "best_value"],
    },
  ]
}

export class StubShipEngineClient implements ShipEngineLikeClient {
  private labelCounter = 0

  async getRates(input: ShipEngineGetRatesInput): Promise<ShipEngineRateResponse> {
    const currency = "aud"
    const allRates = buildStubRates(currency)
    const requestedIds = input.rate_options.carrier_ids ?? []
    const filtered = requestedIds.length
      ? allRates.filter((r) => requestedIds.includes(r.carrier_id))
      : allRates
    const rates = filtered.length ? filtered : allRates
    return {
      rate_response: {
        rates,
        invalid_rates: [],
        rate_request_id: "stub-rate-req",
        shipment_id: "stub-shipment",
        status: "completed",
        errors: [],
      },
      shipment_id: "stub-shipment",
    }
  }

  private buildStubLabel(carrier_id: string, carrier_code: string, service_code: string): ShipEngineLabel {
    this.labelCounter += 1
    const id = `stub-label-${Date.now()}-${this.labelCounter}`
    return {
      label_id: id,
      status: "completed",
      shipment_id: `stub-shipment-${this.labelCounter}`,
      shipment_cost: { currency: "aud", amount: 12.0 },
      tracking_number: `STUB${Date.now()}${this.labelCounter}`,
      carrier_id,
      carrier_code,
      service_code,
      voided: false,
      label_format: "pdf",
      label_layout: "4x6",
      trackable: true,
      tracking_status: "in_transit",
      label_download: {
        pdf: `https://example.com/stub-${id}.pdf`,
        png: `https://example.com/stub-${id}.png`,
        href: `https://example.com/stub-${id}.pdf`,
      },
    }
  }

  async buyLabelFromRate(rateId: string): Promise<ShipEngineLabel> {
    const rate = buildStubRates("aud").find((r) => r.rate_id === rateId)
    return this.buildStubLabel(
      rate?.carrier_id ?? STUB_CARRIER_AUSPOST.carrier_id,
      rate?.carrier_code ?? "australia_post",
      rate?.service_code ?? "australia_post_parcel_post",
    )
  }

  async buyLabel(input: ShipEngineBuyLabelInput): Promise<ShipEngineLabel> {
    return this.buildStubLabel(input.shipment.carrier_id, "australia_post", input.shipment.service_code)
  }

  async voidLabel(_labelId: string): Promise<{ approved: boolean; message?: string }> {
    return { approved: true, message: "stub voided" }
  }

  async trackByLabel(_labelId: string): Promise<ShipEngineTrackingInfo> {
    return {
      tracking_number: "STUB",
      status_code: "IT",
      status_description: "In Transit",
      carrier_code: "australia_post",
      events: [],
    }
  }

  async listCarriers(): Promise<ShipEngineCarrier[]> {
    return [STUB_CARRIER_AUSPOST, STUB_CARRIER_COURIERSPLEASE]
  }
}
