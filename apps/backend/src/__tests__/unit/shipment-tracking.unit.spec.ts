import { resolveShipmentTracking } from "../../lib/shipment-tracking"
import { trackingUrlForCarrierCode } from "../../modules/shipping-common/tracking-url"

describe("resolveShipmentTracking", () => {
  it("uses the ShipEngine Aramex label and builds the Aramex link", () => {
    const out = resolveShipmentTracking({
      provider_id: "shipengine_shipengine",
      data: { carrier_code: "aramex_au_walleted", service_code: "aramex_au_walleted_standard" },
      labels: [{ tracking_number: "MP0098568931", tracking_url: "" }],
    })
    expect(out).toEqual({
      carrier: "Aramex",
      trackingNumber: "MP0098568931",
      trackingUrl: "https://www.aramex.com.au/tools/track?l=MP0098568931",
    })
  })

  it("builds a CouriersPlease link", () => {
    const out = resolveShipmentTracking({
      provider_id: "shipengine_shipengine",
      data: {
        carrier_code: "couriersplease_walleted",
        service_code: "couriersplease_walleted_parcel",
      },
      labels: [{ tracking_number: "CPAZ123", tracking_url: "" }],
    })
    expect(out.carrier).toBe("CouriersPlease")
    expect(out.trackingUrl).toBe("https://www.couriersplease.com.au/tools-track/no/CPAZ123")
  })

  it("prefers a stored tracking_url", () => {
    const out = resolveShipmentTracking({
      provider_id: "auspost_auspost",
      data: {},
      labels: [{ tracking_number: "AP1", tracking_url: "https://example.test/AP1" }],
    })
    expect(out.carrier).toBe("Australia Post")
    expect(out.trackingUrl).toBe("https://example.test/AP1")
  })

  it("falls back to data.tracking_number when labels were not loaded", () => {
    const out = resolveShipmentTracking({
      provider_id: "shipengine_shipengine",
      data: { carrier_code: "aramex_au_walleted", tracking_number: "MP1" },
    })
    expect(out.trackingNumber).toBe("MP1")
    expect(out.trackingUrl).toBe("https://www.aramex.com.au/tools/track?l=MP1")
  })

  it("returns nothing for a manual fulfilment, never the provider id", () => {
    const out = resolveShipmentTracking({ provider_id: "manual_manual", data: {}, labels: [] })
    expect(out).toEqual({ carrier: undefined, trackingNumber: undefined, trackingUrl: undefined })
  })
})

describe("trackingUrlForCarrierCode", () => {
  it("returns empty string when the number or carrier is unknown", () => {
    expect(trackingUrlForCarrierCode("aramex_au_walleted", undefined, "")).toBe("")
    expect(trackingUrlForCarrierCode(undefined, undefined, "MP1")).toBe("")
    expect(trackingUrlForCarrierCode("ups", "ups_ground", "1Z1")).toBe("")
  })

  it("builds the Aramex link from ShipEngine codes", () => {
    expect(
      trackingUrlForCarrierCode("aramex_au_walleted", "aramex_au_walleted_standard", "MP9")
    ).toBe("https://www.aramex.com.au/tools/track?l=MP9")
  })
})
