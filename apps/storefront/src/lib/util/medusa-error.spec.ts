import { isStaleCartError } from "./medusa-error"

describe("isStaleCartError", () => {
  it("treats missing cart / region / product as stale", () => {
    expect(isStaleCartError(new Error("Cart id not found: cart_123"))).toBe(
      true,
    )
    expect(
      isStaleCartError({ message: "Cart with id 'cart_x' not found" }),
    ).toBe(true)
    expect(isStaleCartError(new Error("region was not found"))).toBe(true)
    expect(
      isStaleCartError(
        new Error("variants do not exist or belong to a product"),
      ),
    ).toBe(true)
  })

  it("treats a disabled/removed sales channel as stale (recoverable)", () => {
    expect(isStaleCartError(new Error("Sales channel sc_1 is disabled"))).toBe(
      true,
    )
    expect(
      isStaleCartError({ message: "Sales channel sc_1 was not found" }),
    ).toBe(true)
  })

  it("does NOT treat real inventory shortages as stale (must not retry-loop)", () => {
    expect(
      isStaleCartError(
        new Error("Some variant does not have the required inventory"),
      ),
    ).toBe(false)
    expect(isStaleCartError({ message: "insufficient_inventory" })).toBe(false)
  })

  it("does NOT treat the multi-channel publishable-key config error as stale", () => {
    expect(
      isStaleCartError(
        new Error(
          "Cannot assign sales channel to cart. The Publishable API Key in the header has multiple associated sales channels.",
        ),
      ),
    ).toBe(false)
  })

  it("returns false for unrelated errors", () => {
    expect(isStaleCartError(new Error("network timeout"))).toBe(false)
    expect(isStaleCartError(undefined)).toBe(false)
  })
})
