const complete = jest.fn()
const redirect = jest.fn()

jest.mock("@lib/config", () => ({
  sdk: { store: { cart: { complete: (...a: unknown[]) => complete(...a) } } },
}))
jest.mock("next/navigation", () => ({
  redirect: (...a: unknown[]) => redirect(...a),
}))
jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }))
jest.mock("./cookies", () => ({
  getAuthHeaders: jest.fn().mockResolvedValue({}),
  getCacheTag: jest.fn().mockResolvedValue("tag"),
  getCacheOptions: jest.fn().mockResolvedValue({}),
  getCartId: jest.fn().mockResolvedValue("cart_1"),
  removeCartId: jest.fn(),
  setCartId: jest.fn(),
}))
jest.mock("./regions", () => ({ getRegion: jest.fn() }))

import { placeOrder } from "./cart"

describe("placeOrder", () => {
  it("returns OUT_OF_STOCK with a client-safe message instead of throwing", async () => {
    complete.mockRejectedValue(
      new Error(
        "Not enough stock available for item iitem_1 at location sloc_1",
      ),
    )
    const result = await placeOrder("cart_1")
    expect(result).toMatchObject({ ok: false, code: "OUT_OF_STOCK" })
    expect((result as { message: string }).message).toMatch(/cart/i)
    expect((result as { message: string }).message).not.toMatch(/iitem_/)
  })

  it("returns UNKNOWN for other completion failures", async () => {
    complete.mockRejectedValue(new Error("boom"))
    const result = await placeOrder("cart_1")
    expect(result).toMatchObject({ ok: false, code: "UNKNOWN" })
  })

  it("redirects to the confirmation page on success", async () => {
    complete.mockResolvedValue({ type: "order", order: { id: "order_1" } })
    await placeOrder("cart_1")
    expect(redirect).toHaveBeenCalledWith("/order/order_1/confirmed")
  })
})
