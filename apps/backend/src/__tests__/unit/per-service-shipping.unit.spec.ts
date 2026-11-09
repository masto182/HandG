import ShipEngineProviderService from "../../modules/shipengine/service"
import AusPostProviderService from "../../modules/auspost/service"
import { resetShipEngineClientCache } from "../../modules/shipengine/factory"
import {
  SERVICE_FAMILIES,
  familyForServiceCode,
  familyFromOptionData,
  familyOptionData,
} from "../../modules/shipping-common/service-families"

const noopLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any

function siteConfigDeps(siteConfig: Record<string, unknown>) {
  return {
    logger: noopLogger,
    resolve: (name: string): any => {
      if (name === "siteConfig") {
        return {
          get: async (key: string) =>
            Object.prototype.hasOwnProperty.call(siteConfig, key) ? siteConfig[key] : undefined,
        }
      }
      throw new Error(`unexpected resolve(${name})`)
    },
  } as any
}

function makeShipEngine(siteConfig: Record<string, unknown> = {}) {
  resetShipEngineClientCache()
  delete process.env.SHIPENGINE_API_KEY
  return new ShipEngineProviderService(siteConfigDeps(siteConfig), {
    carrier_ids: ["se-aramex", "se-cp"],
  } as any)
}

function makeAusPost(siteConfig: Record<string, unknown> = {}) {
  return new AusPostProviderService(siteConfigDeps(siteConfig), {} as any)
}

const family = (id: string) => SERVICE_FAMILIES.find((f) => f.family === id)!
const optionData = (id: string) => familyOptionData(family(id))

const address = {
  first_name: "Buyer",
  last_name: "X",
  address_1: "1 Smith St",
  city: "Melbourne",
  province: "VIC",
  postal_code: "3000",
  country_code: "AU",
}

const rate = (carrier_id: string, carrier_code: string, service_code: string, dollars: number) => ({
  rate_id: `r-${service_code}`,
  carrier_id,
  carrier_code,
  service_code,
  shipping_amount: { amount: dollars, currency: "aud" },
})

const liveRates = [
  rate("se-aramex", "aramex_au_walleted", "aramex_au_walleted_standard", 10),
  rate("se-aramex", "aramex_au_walleted", "aramex_au_walleted_signature_required", 12),
  rate("se-aramex", "aramex_au_walleted", "aramex_au_walleted_leave_at_door", 9),
  rate("se-aramex", "aramex_au_walleted", "fastway_au_walleted_priority", 20),
  rate("se-cp", "couriersplease_walleted", "couriersplease_walleted_parcel", 8),
]

function stubOption(provider: any, id: string | null) {
  provider.shippingOptionReader_ = jest.fn(async (optionId: string) =>
    id
      ? { id: optionId, provider_id: "fp_x", data: optionData(id) }
      : { id: optionId, provider_id: "fp_x", data: {} }
  )
}

describe("service families", () => {
  it("does not offer Aramex signature_required in any family", () => {
    expect(familyForServiceCode("aramex_au_walleted_signature_required")).toBeUndefined()
  })

  it("treats legacy dynamic option data as no family", () => {
    expect(familyFromOptionData({ id: "shipengine-dynamic" })).toBeNull()
    expect(familyFromOptionData({})).toBeNull()
  })

  it("exposes every family plus the legacy option from getFulfillmentOptions", async () => {
    const se = (await makeShipEngine().getFulfillmentOptions()).map((o: any) => o.id)
    expect(se).toEqual(
      expect.arrayContaining(["aramex_road_express", "couriersplease_parcel", "shipengine-dynamic"])
    )
    const ap = (await makeAusPost().getFulfillmentOptions()).map((o: any) => o.id)
    expect(ap).toEqual(
      expect.arrayContaining(["auspost_parcel_post", "auspost_express_post", "auspost-dynamic"])
    )
  })

  it("validateOption rejects a family from the other provider", async () => {
    expect(await makeShipEngine().validateOption(optionData("auspost_parcel_post"))).toBe(false)
    expect(await makeShipEngine().validateOption(optionData("aramex_priority"))).toBe(true)
  })
})

describe("ShipEngine per-service calculatePrice", () => {
  const ctx = { shipping_address: address, currency_code: "aud", items: [] } as any

  it("uses the fresh cached amount (fee already included) when the service is in the family", async () => {
    const p = makeShipEngine({ shipping_handling_fee_aud: 3 })
    const res = await p.calculatePrice(
      optionData("aramex_road_express") as any,
      {
        service_code: "aramex_au_walleted_standard",
        amount: 1500,
        rate_quoted_at: new Date().toISOString(),
      } as any,
      ctx
    )
    expect(res.calculated_amount).toBe(15)
  })

  it("re-quotes within the family and adds the handling fee when the cache is stale", async () => {
    const p = makeShipEngine({ shipping_handling_fee_aud: 3 })
    ;(p as any).fetchRates = jest.fn(async () => liveRates)
    const res = await p.calculatePrice(
      optionData("aramex_priority") as any,
      {
        service_code: "fastway_au_walleted_priority",
        amount: 100,
        rate_quoted_at: "2000-01-01T00:00:00Z",
      } as any,
      ctx
    )
    expect(res.calculated_amount).toBe(23)
  })

  it("never falls back to a cheaper service from another family", async () => {
    const p = makeShipEngine({ shipping_handling_fee_aud: 3 })
    ;(p as any).fetchRates = jest.fn(async () =>
      liveRates.filter((r) => !r.service_code.includes("priority"))
    )
    const res = await p.calculatePrice(
      optionData("aramex_priority") as any,
      {
        service_code: "fastway_au_walleted_priority",
        amount: 2300,
        rate_quoted_at: "2000-01-01T00:00:00Z",
      } as any,
      ctx
    )
    expect(res.calculated_amount).toBe(23)
  })

  it("ignores a cached amount quoted for a service outside the family", async () => {
    const p = makeShipEngine({ shipping_handling_fee_aud: 0 })
    ;(p as any).fetchRates = jest.fn(async () => liveRates)
    const res = await p.calculatePrice(
      optionData("aramex_priority") as any,
      {
        service_code: "couriersplease_walleted_parcel",
        amount: 800,
        rate_quoted_at: new Date().toISOString(),
      } as any,
      ctx
    )
    expect(res.calculated_amount).toBe(20)
  })
})

describe("ShipEngine createFulfillment service resolution", () => {
  const items: any[] = []

  it("customer choice: buys the method's own service", async () => {
    const p = makeShipEngine({ auto_pick_cheapest_label: false })
    stubOption(p, "aramex_road_express")
    const buy = jest.spyOn((p as any).client_, "buyLabel")
    const data = {
      rate_id: "r1",
      carrier_id: "se-aramex",
      carrier_code: "aramex_au_walleted",
      service_code: "aramex_au_walleted_standard",
    }
    const res = await p.createFulfillment(
      data,
      items,
      { shipping_address: address } as any,
      { shipping_option_id: "so_1" } as any
    )
    expect(buy).toHaveBeenCalledWith(
      expect.objectContaining({
        shipment: expect.objectContaining({
          carrier_id: "se-aramex",
          service_code: "aramex_au_walleted_standard",
        }),
      })
    )
    expect(res.data.admin_override).toBe(false)
  })

  it("admin override: data={} on another option buys that option's service, skipping auto-pick", async () => {
    const p = makeShipEngine({ auto_pick_cheapest_label: true })
    stubOption(p, "couriersplease_parcel")
    ;(p as any).fetchRates = jest.fn(async () => liveRates)
    const buy = jest.spyOn((p as any).client_, "buyLabel")
    const order = {
      shipping_address: address,
      shipping_methods: [
        {
          data: {
            carrier_code: "aramex_au_walleted",
            service_code: "fastway_au_walleted_priority",
          },
        },
      ],
    }
    const res = await p.createFulfillment(
      {},
      items,
      order as any,
      { shipping_option_id: "so_cp" } as any
    )
    expect(buy).toHaveBeenCalledWith(
      expect.objectContaining({
        shipment: expect.objectContaining({
          carrier_id: "se-cp",
          service_code: "couriersplease_walleted_parcel",
        }),
      })
    )
    expect(res.data.admin_override).toBe(true)
    expect(res.data.auto_picked).toBe(false)
    expect(res.data.customer_chosen_service_code).toBe("fastway_au_walleted_priority")
  })

  it("admin override to Aramex Road Express buys standard even if the customer had signature", async () => {
    const p = makeShipEngine()
    stubOption(p, "aramex_road_express")
    ;(p as any).fetchRates = jest.fn(async () => liveRates)
    const buy = jest.spyOn((p as any).client_, "buyLabel")
    const order = {
      shipping_address: address,
      shipping_methods: [
        { data: { service_code: "couriersplease_walleted_parcel", force_sod: true } },
      ],
    }
    await p.createFulfillment({}, items, order as any, { shipping_option_id: "so_ar" } as any)
    expect(buy).toHaveBeenCalledWith(
      expect.objectContaining({
        shipment: expect.objectContaining({ service_code: "aramex_au_walleted_standard" }),
      })
    )
  })

  it("admin override fails loudly when the service has no live rate", async () => {
    const p = makeShipEngine()
    stubOption(p, "aramex_priority")
    ;(p as any).fetchRates = jest.fn(async () =>
      liveRates.filter((r) => !r.service_code.includes("priority"))
    )
    const buy = jest.spyOn((p as any).client_, "buyLabel")
    await expect(
      p.createFulfillment(
        {},
        items,
        { shipping_address: address, shipping_methods: [] } as any,
        { shipping_option_id: "so_p" } as any
      )
    ).rejects.toThrow(/not available/)
    expect(buy).not.toHaveBeenCalled()
  })

  it("legacy dynamic option keeps the shipping_methods fallback", async () => {
    const p = makeShipEngine({ auto_pick_cheapest_label: false })
    stubOption(p, null)
    const buy = jest.spyOn((p as any).client_, "buyLabel")
    const order = {
      shipping_address: address,
      shipping_methods: [
        { data: { carrier_id: "se-aramex", service_code: "aramex_au_walleted_standard" } },
      ],
    }
    const res = await p.createFulfillment(
      {},
      items,
      order as any,
      { shipping_option_id: "so_legacy" } as any
    )
    expect(buy).toHaveBeenCalledWith(
      expect.objectContaining({
        shipment: expect.objectContaining({ service_code: "aramex_au_walleted_standard" }),
      })
    )
    expect(res.data.admin_override).toBe(false)
  })

  it("a failed option lookup throws instead of guessing", async () => {
    const p = makeShipEngine()
    ;(p as any).shippingOptionReader_ = jest.fn(async () => {
      throw new Error("db down")
    })
    await expect(
      p.createFulfillment(
        { service_code: "x" },
        items,
        { shipping_address: address } as any,
        { shipping_option_id: "so" } as any
      )
    ).rejects.toThrow(/Could not load shipping option/)
  })
})

describe("AusPost per-service", () => {
  it("override from a ShipEngine order lodges the picked AusPost service", async () => {
    const p = makeAusPost({ heat_hold_enabled: false })
    stubOption(p, "auspost_express_post")
    const order = {
      shipping_methods: [
        { data: { service_code: "aramex_au_walleted_standard", force_sod: true } },
      ],
    }
    const res = await p.createFulfillment(
      {},
      [],
      order as any,
      { shipping_option_id: "so_ap" } as any
    )
    expect(res.data.service_code).toBe("AUS_PARCEL_EXPRESS")
    expect(res.data.admin_override).toBe(true)
    expect(res.data.sod_requested).toBe(true)
  })

  it("customer's AusPost choice is not treated as an override", async () => {
    const p = makeAusPost({ heat_hold_enabled: false })
    stubOption(p, "auspost_parcel_post")
    const res = await p.createFulfillment(
      { service_code: "AUS_PARCEL_REGULAR" },
      [],
      {} as any,
      { shipping_option_id: "so" } as any
    )
    expect(res.data.service_code).toBe("AUS_PARCEL_REGULAR")
    expect(res.data.admin_override).toBe(false)
  })

  it("calculatePrice does not add the ShipEngine handling fee", async () => {
    const p = makeAusPost({ shipping_handling_fee_aud: 3, auspost_enabled: false })
    const res = await p.calculatePrice(
      optionData("auspost_parcel_post") as any,
      { service_code: "AUS_PARCEL_REGULAR", amount: 1200 } as any,
      { shipping_address: address, currency_code: "aud", items: [] } as any
    )
    expect(res.calculated_amount).toBe(12)
  })
})
