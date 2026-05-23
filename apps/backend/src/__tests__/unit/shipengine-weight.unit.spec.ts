import { computeShipmentWeightG } from "../../modules/shipengine/weight"

describe("computeShipmentWeightG", () => {
  const D = 750

  it("returns 0 for empty/undefined items", () => {
    expect(computeShipmentWeightG([], D)).toBe(0)
    expect(computeShipmentWeightG(undefined, D)).toBe(0)
    expect(computeShipmentWeightG(null, D)).toBe(0)
  })

  it("uses variant.weight when present", () => {
    const items = [{ quantity: 2, variant: { weight: 500 }, product: null }]
    expect(computeShipmentWeightG(items, D)).toBe(1000)
  })

  it("falls back to product.weight when variant weight missing", () => {
    const items = [{ quantity: 3, variant: null, product: { weight: 400 } }]
    expect(computeShipmentWeightG(items, D)).toBe(1200)
  })

  it("falls back to default when neither weight present", () => {
    const items = [{ quantity: 4, variant: null, product: null }]
    expect(computeShipmentWeightG(items, D)).toBe(D * 4)
  })

  it("ignores zero/negative quantities and treats invalid weights as default", () => {
    const items = [
      { quantity: 0, variant: { weight: 999 }, product: null },
      { quantity: -1, variant: { weight: 999 }, product: null },
      { quantity: 2, variant: { weight: 0 }, product: null },
      { quantity: 1, variant: { weight: NaN }, product: null },
    ]
    expect(computeShipmentWeightG(items, D)).toBe(D * 2 + D)
  })
})
