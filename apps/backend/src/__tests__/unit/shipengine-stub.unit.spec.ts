import { StubShipEngineClient } from "../../modules/shipengine/stub"
import { getShipEngineClient, resetShipEngineClientCache } from "../../modules/shipengine/factory"

describe("StubShipEngineClient", () => {
  it("returns 3 deterministic AUD rates with AU carrier_codes", async () => {
    const client = new StubShipEngineClient()
    const res = await client.getRates({
      rate_options: { carrier_ids: [] },
      shipment: {
        ship_to: { address_line1: "1", city_locality: "x", state_province: "VIC", postal_code: "3000", country_code: "AU" },
        ship_from: { address_line1: "1", city_locality: "x", state_province: "NSW", postal_code: "2000", country_code: "AU" },
        packages: [{ weight: { value: 1500, unit: "gram" } }],
      },
    })
    expect(res.rate_response.rates).toHaveLength(3)
    const codes = res.rate_response.rates.map((r) => r.carrier_code).sort()
    expect(codes).toEqual(["australia_post", "australia_post", "couriers_please"])
    for (const r of res.rate_response.rates) {
      expect(r.shipping_amount.currency).toBe("aud")
    }
  })

  it("buyLabelFromRate returns a deterministic-looking stub label", async () => {
    const client = new StubShipEngineClient()
    const a = await client.buyLabelFromRate("stub-auspost-parcel")
    expect(a.label_id.startsWith("stub-label-")).toBe(true)
    expect(a.tracking_number).toMatch(/^STUB/)
    expect(a.label_download.pdf).toContain("https://example.com/")
  })

  it("listCarriers returns 2 stub carriers (AusPost + CouriersPlease)", async () => {
    const client = new StubShipEngineClient()
    const carriers = await client.listCarriers()
    expect(carriers).toHaveLength(2)
    const codes = carriers.map((c) => c.carrier_code).sort()
    expect(codes).toEqual(["australia_post", "couriers_please"])
  })

  it("voidLabel approves any id (stub mode)", async () => {
    const client = new StubShipEngineClient()
    const res = await client.voidLabel("does-not-exist")
    expect(res.approved).toBe(true)
  })
})

describe("getShipEngineClient factory", () => {
  const prevKey = process.env.SHIPENGINE_API_KEY
  beforeEach(() => {
    resetShipEngineClientCache()
  })
  afterAll(() => {
    if (prevKey === undefined) delete process.env.SHIPENGINE_API_KEY
    else process.env.SHIPENGINE_API_KEY = prevKey
    resetShipEngineClientCache()
  })

  it("returns a Stub client when SHIPENGINE_API_KEY is empty", () => {
    delete process.env.SHIPENGINE_API_KEY
    const c = getShipEngineClient()
    expect(c).toBeInstanceOf(StubShipEngineClient)
  })
})
