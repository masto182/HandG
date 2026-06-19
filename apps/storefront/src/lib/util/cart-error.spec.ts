import { classifyCartError, cartErrorMessage } from "./cart-error"

describe("classifyCartError", () => {
  it("classifies early-access errors", () => {
    expect(classifyCartError(new Error("variant is early-access only"))).toBe(
      "early_access",
    )
    expect(classifyCartError({ message: "not_yet_available" })).toBe(
      "early_access",
    )
  })

  it("classifies stock errors", () => {
    expect(
      classifyCartError({
        message: "Some variant does not have the required inventory",
      }),
    ).toBe("out_of_stock")
    expect(classifyCartError(new Error("out of stock"))).toBe("out_of_stock")
    expect(classifyCartError(new Error("SOLD OUT"))).toBe("out_of_stock")
  })

  it("collapses masked Next production errors to generic", () => {
    const masked =
      "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details."
    expect(classifyCartError(new Error(masked))).toBe("generic")
  })

  it("collapses unknown / empty errors to generic", () => {
    expect(classifyCartError(undefined)).toBe("generic")
    expect(classifyCartError({})).toBe("generic")
    expect(classifyCartError(new Error("kaboom"))).toBe("generic")
  })
})

describe("cartErrorMessage", () => {
  it("never returns raw server text for generic errors", () => {
    const masked = new Error(
      "An error occurred in the Server Components render. A digest property is included...",
    )
    const out = cartErrorMessage(masked)
    expect(out).toBe("Couldn't add this item to cart. Please try again.")
    expect(out).not.toMatch(/Server Components|digest/i)
  })

  it("returns the stock message for inventory failures", () => {
    expect(cartErrorMessage(new Error("insufficient inventory"))).toBe(
      "Out of stock",
    )
  })
})
