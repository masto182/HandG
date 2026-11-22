import { classifyCompleteFailure } from "./checkout-errors"

describe("classifyCompleteFailure", () => {
  it("maps Medusa stock errors to a client-safe OUT_OF_STOCK result", () => {
    const result = classifyCompleteFailure(
      "Not enough stock available for item iitem_1 at location sloc_1",
    )
    expect(result.code).toBe("OUT_OF_STOCK")
    expect(result.message).toMatch(/cart/i)
    expect(result.message).not.toMatch(/iitem_|sloc_/)
  })

  it("maps anything else to UNKNOWN without leaking the raw error", () => {
    const result = classifyCompleteFailure("boom: db connection string xyz")
    expect(result.code).toBe("UNKNOWN")
    expect(result.message).not.toMatch(/boom|xyz/)
  })

  it("tolerates a missing message", () => {
    expect(classifyCompleteFailure(undefined).code).toBe("UNKNOWN")
  })
})
