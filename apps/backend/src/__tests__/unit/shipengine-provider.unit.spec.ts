import ShipEngineProviderService from "../../modules/shipengine/service"
import { StubShipEngineClient } from "../../modules/shipengine/stub"
import { resetShipEngineClientCache } from "../../modules/shipengine/factory"
import { MedusaError } from "@medusajs/framework/utils"

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
} as any

function makeProvider(siteConfig: Record<string, unknown>) {
  resetShipEngineClientCache()
  // Force stub
  delete process.env.SHIPENGINE_API_KEY
  // Pass carrier_ids so auto-pick path can call the stub client.
  const options = {
    carrier_ids: ["se-stub-auspost", "se-stub-couriersplease"],
  }
  const provider = new ShipEngineProviderService(
    {
      logger: noopLogger,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve: (name: string): any => {
        if (name === "siteConfig") {
          return {
            get: async (key: string) =>
              Object.prototype.hasOwnProperty.call(siteConfig, key) ? siteConfig[key] : undefined,
          }
        }
        throw new Error(`unexpected resolve(${name})`)
      },
    } as any,
    options as any,
  )
  return provider
}

const sampleAddress = {
  first_name: "Buyer",
  last_name: "X",
  address_1: "1 Smith St",
  city: "Melbourne",
  province: "VIC",
  postal_code: "3000",
  country_code: "AU",
}

describe("ShipEngineProviderService heat hold", () => {
  it("blocks createFulfillment when heat_hold_enabled and no override", async () => {
    const provider = makeProvider({ heat_hold_enabled: true })
    const data = { rate_id: "stub-auspost-parcel", carrier_id: "se-stub-auspost", carrier_code: "australia_post", service_code: "australia_post_parcel_post" }
    await expect(
      provider.createFulfillment(data, [], { metadata: {}, shipping_address: sampleAddress } as any, {} as any),
    ).rejects.toThrow(MedusaError)
  })

  it("allows createFulfillment when override set", async () => {
    const provider = makeProvider({ heat_hold_enabled: true, auto_pick_cheapest_label: false })
    const data = {
      rate_id: "stub-auspost-parcel",
      carrier_id: "se-stub-auspost",
      carrier_code: "australia_post",
      service_code: "australia_post_parcel_post",
    }
    const order = { metadata: { heat_hold_override: true }, shipping_address: sampleAddress }
    const res = await provider.createFulfillment(data, [], order as any, {} as any)
    expect(res.data.label_id).toMatch(/^stub-label-/)
    expect(res.data.bought_via).toBe("rate_id")
  })

  it("allows createFulfillment when heat hold disabled", async () => {
    const provider = makeProvider({ heat_hold_enabled: false, auto_pick_cheapest_label: false })
    const data = {
      rate_id: "stub-auspost-parcel",
      carrier_id: "se-stub-auspost",
      carrier_code: "australia_post",
      service_code: "australia_post_parcel_post",
    }
    const res = await provider.createFulfillment(data, [], { metadata: {}, shipping_address: sampleAddress } as any, {} as any)
    expect(res.labels[0].tracking_number).toMatch(/^STUB/)
  })
})

describe("ShipEngineProviderService auto-pick-cheapest", () => {
  it("picks cheapest live rate at fulfillment when auto_pick_cheapest_label=true (stub: CouriersPlease $11)", async () => {
    const provider = makeProvider({ heat_hold_enabled: false, auto_pick_cheapest_label: true })
    const data = {
      // Customer chose AusPost Express ($20), most expensive in stub
      rate_id: "stub-auspost-express",
      carrier_id: "se-stub-auspost",
      carrier_code: "australia_post",
      service_code: "australia_post_express_post",
    }
    const order = { metadata: {}, shipping_address: sampleAddress }
    const res = await provider.createFulfillment(data, [], order as any, {} as any)
    expect(res.data.auto_picked).toBe(true)
    expect(res.data.customer_chosen_carrier_code).toBe("australia_post")
    // Stub returns rates; cheapest is CouriersPlease at $11
    expect(res.data.carrier_code).toBe("couriers_please")
  })

  it("honours customer choice when auto_pick_cheapest_label=false", async () => {
    const provider = makeProvider({ heat_hold_enabled: false, auto_pick_cheapest_label: false })
    const data = {
      rate_id: "stub-auspost-express",
      carrier_id: "se-stub-auspost",
      carrier_code: "australia_post",
      service_code: "australia_post_express_post",
    }
    const order = { metadata: {}, shipping_address: sampleAddress }
    const res = await provider.createFulfillment(data, [], order as any, {} as any)
    expect(res.data.auto_picked).toBe(false)
    expect(res.data.service_code).toBe("australia_post_express_post")
  })
})

describe("ShipEngineProviderService cancellation", () => {
  it("cancelFulfillment tolerates an unknown label_id", async () => {
    const provider = makeProvider({})
    const res = await provider.cancelFulfillment({ label_id: "stub-bogus" })
    expect((res as any).approved).toBe(true)
  })

  it("cancelFulfillment without label_id returns no-op success", async () => {
    const provider = makeProvider({})
    const res = await provider.cancelFulfillment({})
    expect((res as any).voided).toBe(true)
  })
})

describe("ShipEngineProviderService validation", () => {
  it("validateFulfillmentData requires rate_id or carrier+service", async () => {
    const provider = makeProvider({})
    await expect(provider.validateFulfillmentData({}, {}, {})).rejects.toThrow(MedusaError)
  })

  it("validateFulfillmentData accepts a rate_id alone", async () => {
    const provider = makeProvider({})
    const out = await provider.validateFulfillmentData({}, { rate_id: "se-1" }, {})
    expect(out.rate_id).toBe("se-1")
  })
})
