import { computeDiscountedPrice } from "../../lib/campaign-pricing"

describe("computeDiscountedPrice", () => {
  it("applies a percentage discount and rounds to the nearest cent", () => {
    expect(computeDiscountedPrice(2500, "percentage", 20)).toBe(2000)
    expect(computeDiscountedPrice(999, "percentage", 10)).toBe(899)
  })

  it("applies a fixed-dollar discount (discount_value is dollars, price is cents)", () => {
    expect(computeDiscountedPrice(2500, "fixed", 5)).toBe(2000)
  })

  it("floors a fixed discount at zero, never negative", () => {
    expect(computeDiscountedPrice(300, "fixed", 10)).toBe(0)
  })

  it("100% off reduces price to zero", () => {
    expect(computeDiscountedPrice(2500, "percentage", 100)).toBe(0)
  })

  it("0% off leaves price unchanged", () => {
    expect(computeDiscountedPrice(2500, "percentage", 0)).toBe(2500)
  })
})
