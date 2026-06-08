/**
 * Tests checkPriceAlertImmediate conditional gating.
 * The function fires a price-alert email when a customer sets a target_price
 * that is already met by the current lowest variant price.
 */

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn(async () => ({ data: { id: "msg_test" }, error: null })) },
  })),
}))

jest.mock("../../lib/email", () => ({
  sendTemplate: jest.fn(async () => ({ sent: true })),
  refreshEmailConfig: jest.fn(async () => {}),
  getStoreUrl: jest.fn(() => "https://test.example.com"),
}))

jest.mock("../../lib/wishlist-price", () => ({
  getLowestVariantPrice: jest.fn(),
}))

import { checkPriceAlertImmediate } from "../../api/store/customers/me/wishlist/check-price-alert"
import * as emailLib from "../../lib/email"
import * as wishlistPriceLib from "../../lib/wishlist-price"
import { Modules } from "@medusajs/framework/utils"

const sendMock = emailLib.sendTemplate as jest.Mock
const getPriceMock = wishlistPriceLib.getLowestVariantPrice as jest.Mock

const TEST_PRODUCT = {
  id: "prod_1",
  title: "Test Stout",
  handle: "test-stout",
}
const TEST_CUSTOMER = {
  id: "cust_1",
  email: "test@example.com",
  first_name: "Tester",
}

function makeScope({
  pricedResult = { product: TEST_PRODUCT, lowestPrice: 25.0 },
  customerResult = [TEST_CUSTOMER],
}: {
  pricedResult?: { product: any; lowestPrice: number } | null
  customerResult?: any[]
} = {}) {
  getPriceMock.mockResolvedValue(pricedResult)

  // Cache service instances so every resolve(key) returns the same mock object
  const customerService = { listCustomers: jest.fn(async () => customerResult) }
  const notifService = { createNotifications: jest.fn(async () => undefined) }
  const wishlistService = { updateWishlists: jest.fn(async () => undefined) }

  const scope = {
    _services: { customerService, notifService, wishlistService },
    resolve(key: string) {
      if (key === Modules.CUSTOMER) return customerService
      if (key === "inbox") return notifService
      if (key === "wishlist") return wishlistService
      throw new Error(`unexpected: ${key}`)
    },
  }
  return scope
}

function makeItem(
  overrides: Partial<{
    id: string
    customer_id: string
    product_id: string
    mode: string
    target_price: number | null
    price_alert_sent: boolean
  }> = {}
) {
  return {
    id: "wi_1",
    customer_id: "cust_1",
    product_id: "prod_1",
    mode: "buy_at_price",
    target_price: 30.0,
    price_alert_sent: false,
    ...overrides,
  }
}

describe("checkPriceAlertImmediate", () => {
  beforeEach(() => {
    sendMock.mockClear()
    getPriceMock.mockClear()
  })

  it("returns early when mode is not buy_at_price", async () => {
    const scope = makeScope()
    await checkPriceAlertImmediate(scope as any, makeItem({ mode: "buy_later" }))
    expect(getPriceMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("returns early when target_price is null", async () => {
    const scope = makeScope()
    await checkPriceAlertImmediate(scope as any, makeItem({ target_price: null }))
    expect(getPriceMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("returns early when price_alert_sent is already true (idempotent)", async () => {
    const scope = makeScope()
    await checkPriceAlertImmediate(scope as any, makeItem({ price_alert_sent: true }))
    expect(getPriceMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("returns early when getLowestVariantPrice returns null (no pricing data)", async () => {
    const scope = makeScope({ pricedResult: null })
    await checkPriceAlertImmediate(scope as any, makeItem())
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("returns early when lowestPrice > target_price (target not met)", async () => {
    // lowestPrice=35, target=30 → not met
    const scope = makeScope({ pricedResult: { product: TEST_PRODUCT, lowestPrice: 35.0 } })
    await checkPriceAlertImmediate(scope as any, makeItem({ target_price: 30.0 }))
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("returns early when customer is not found", async () => {
    const scope = makeScope({ customerResult: [] })
    await checkPriceAlertImmediate(scope as any, makeItem())
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("sends alert and stamps price_alert_sent when lowestPrice === target_price", async () => {
    // lowestPrice=30, target=30 → exactly met
    const scope = makeScope({ pricedResult: { product: TEST_PRODUCT, lowestPrice: 30.0 } })
    await checkPriceAlertImmediate(scope as any, makeItem({ target_price: 30.0 }))
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ category: "wishlist_offers", to: TEST_CUSTOMER.email })
    )
    expect(scope._services.wishlistService.updateWishlists).toHaveBeenCalledWith(
      expect.objectContaining({ price_alert_sent: true })
    )
  })

  it("sends alert when lowestPrice < target_price (price below target)", async () => {
    // lowestPrice=20, target=30 → exceeded
    const scope = makeScope({ pricedResult: { product: TEST_PRODUCT, lowestPrice: 20.0 } })
    await checkPriceAlertImmediate(scope as any, makeItem({ target_price: 30.0 }))
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it("creates an in-app notification alongside the email", async () => {
    const scope = makeScope()
    await checkPriceAlertImmediate(scope as any, makeItem())
    expect(scope._services.notifService.createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: "cust_1", type: "wishlist_match" })
    )
  })

  it("formats prices as dollar strings in the email props", async () => {
    const scope = makeScope({ pricedResult: { product: TEST_PRODUCT, lowestPrice: 19.99 } })
    await checkPriceAlertImmediate(scope as any, makeItem({ target_price: 25.0 }))
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ currentPrice: "$19.99", targetPrice: "$25.00" }),
      })
    )
  })
})
