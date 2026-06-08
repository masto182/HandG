import { decideLowStock } from "../../subscribers/wishlist-low-stock-alert"

describe("wishlist low-stock decision (C6)", () => {
  it("sends when low and not yet alerted", () => {
    expect(decideLowStock(2, 2, false)).toBe("send")
    expect(decideLowStock(1, 5, false)).toBe("send")
  })

  it("skips when low but already alerted (no resend)", () => {
    expect(decideLowStock(2, 2, true)).toBe("skip")
  })

  it("resets the flag when stock recovers above threshold", () => {
    expect(decideLowStock(10, 2, true)).toBe("reset")
  })

  it("does nothing when above threshold and never alerted", () => {
    expect(decideLowStock(10, 2, false)).toBe("skip")
  })
})
