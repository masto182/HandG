import {
  CurrencyMismatchError,
  cartToShipEngineShipment,
  rateToShippingOption,
} from "../../modules/shipengine/mapping"
import type { ShipEngineRate } from "../../modules/shipengine/types"

const baseRate: ShipEngineRate = {
  rate_id: "se-rate-1",
  carrier_id: "se-carrier-1",
  carrier_code: "australia_post",
  carrier_friendly_name: "Australia Post",
  service_code: "australia_post_parcel_post",
  service_type: "Parcel Post",
  shipping_amount: { currency: "aud", amount: 12.34 },
  delivery_days: 4,
}

describe("rateToShippingOption", () => {
  it("converts decimal dollars to integer minor units", () => {
    const opt = rateToShippingOption(baseRate, "aud")
    expect(opt.amount).toBe(1234)
    expect(opt.currency_code).toBe("aud")
  })

  it("includes other_amount and confirmation_amount in total", () => {
    const opt = rateToShippingOption(
      {
        ...baseRate,
        shipping_amount: { currency: "aud", amount: 10.0 },
        other_amount: { currency: "aud", amount: 1.5 },
        confirmation_amount: { currency: "aud", amount: 0.5 },
      },
      "aud",
    )
    expect(opt.amount).toBe(1200)
  })

  it("throws CurrencyMismatchError when rate currency != cart currency", () => {
    expect(() => rateToShippingOption({ ...baseRate, shipping_amount: { currency: "usd", amount: 12 } }, "aud"))
      .toThrow(CurrencyMismatchError)
  })

  it("composes a stable id from rate_id and a friendly name", () => {
    const opt = rateToShippingOption(baseRate, "aud")
    expect(opt.id).toBe("shipengine-se-rate-1")
    expect(opt.name).toContain("Australia Post")
    expect(opt.name).toContain("Parcel Post")
  })

  it("captures rate_quoted_at iso string", () => {
    const opt = rateToShippingOption(baseRate, "aud")
    expect(typeof opt.data.rate_quoted_at).toBe("string")
    expect(Number.isFinite(Date.parse(opt.data.rate_quoted_at))).toBe(true)
  })
})

describe("cartToShipEngineShipment", () => {
  const fromAddress = {
    shipping_from_name: "HG",
    shipping_from_phone: "+61 0 0000 0000",
    shipping_from_address_1: "1 Hillside Lane",
    shipping_from_city: "Sydney",
    shipping_from_state: "nsw",
    shipping_from_postcode: "2000",
    shipping_from_country: "au",
  }

  it("uppercases state and country codes", () => {
    const body = cartToShipEngineShipment({
      shippingAddress: { country_code: "au", province: "vic", postal_code: "3000", city: "Melbourne", address_1: "1 Test St" },
      packages: [{ weightG: 1000, lengthCm: 22, widthCm: 16, heightCm: 7 }],
      fromAddress,
      carrierIds: ["se-1"],
      validateMode: "validate_and_clean",
    })
    expect(body.shipment.ship_to.country_code).toBe("AU")
    expect(body.shipment.ship_to.state_province).toBe("VIC")
    expect(body.shipment.ship_from.country_code).toBe("AU")
    expect(body.shipment.ship_from.state_province).toBe("NSW")
  })

  it("maps PackedBox[] to shipment packages", () => {
    const body = cartToShipEngineShipment({
      shippingAddress: { country_code: "AU", province: "VIC", postal_code: "3000", address_1: "x", city: "x" },
      packages: [
        { weightG: 1700, lengthCm: 24, widthCm: 19, heightCm: 12 },
        { weightG: 800, lengthCm: 22, widthCm: 16, heightCm: 7 },
      ],
      fromAddress,
      carrierIds: ["se-1"],
      validateMode: "no_validation",
    })
    expect(body.shipment.packages).toHaveLength(2)
    expect(body.shipment.packages[0].weight.value).toBe(1700)
    expect(body.shipment.packages[0].weight.unit).toBe("gram")
    expect(body.shipment.packages[0].dimensions).toEqual({ unit: "centimeter", length: 24, width: 19, height: 12 })
    expect(body.shipment.packages[1].weight.value).toBe(800)
    expect(body.shipment.packages[1].dimensions).toEqual({ unit: "centimeter", length: 22, width: 16, height: 7 })
  })
})
