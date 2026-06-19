import medusaError, { isStaleCartError } from "./medusa-error"

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

describe("medusaError", () => {
  describe("Medusa JS SDK v2 FetchError (numeric status)", () => {
    it("throws the message, capitalized", () => {
      expect(() =>
        medusaError({ status: 400, message: "bad request" }),
      ).toThrow("Bad request")
    })

    it("falls back to statusText when message is absent", () => {
      expect(() =>
        medusaError({ status: 500, statusText: "server error" }),
      ).toThrow("Server error")
    })

    it("falls back to a generic message when both are absent", () => {
      expect(() => medusaError({ status: 503 })).toThrow(
        "An unknown error occurred.",
      )
    })
  })

  describe("Axios-style error (response present)", () => {
    const config = { url: "/store/carts", baseURL: "https://api.test" }

    beforeEach(() => {
      jest.spyOn(console, "error").mockImplementation(() => {})
    })

    it("throws the object data.message, capitalized with a period", () => {
      expect(() =>
        medusaError({
          response: {
            data: { message: "not found" },
            status: 404,
            headers: {},
          },
          config,
        }),
      ).toThrow("Not found.")
    })

    it("stringifies object data when message is absent", () => {
      expect(() =>
        medusaError({
          response: { data: {}, status: 500, headers: {} },
          config,
        }),
      ).toThrow("[object Object].")
    })

    it("handles string response data", () => {
      expect(() =>
        medusaError({
          response: { data: "raw failure", status: 500, headers: {} },
          config,
        }),
      ).toThrow("Raw failure.")
    })
  })

  it("reports a request that received no response", () => {
    expect(() => medusaError({ request: "XHR-object" })).toThrow(
      "No response received: XHR-object",
    )
  })

  it("reports a request-setup error when nothing else matches", () => {
    expect(() => medusaError({ message: "setup boom" })).toThrow(
      "Error setting up the request: setup boom",
    )
  })
})
