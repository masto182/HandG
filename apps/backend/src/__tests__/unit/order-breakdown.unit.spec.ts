import { computeOrderBreakdown } from "../../lib/order-breakdown"
import { renderEmail } from "../../lib/render-email"
import * as OrderPlaced from "../../emails/order-placed"
import { buildOwnerOrderAlert } from "../../lib/owner-alerts"

describe("computeOrderBreakdown", () => {
  it("derives discount so rows add up to the charged total", () => {
    const b = computeOrderBreakdown({
      items: [
        { quantity: 3, unit_price: 30 },
        { quantity: 1, unit_price: 25.5 },
      ],
      shippingMethods: [{ name: "Aramex", amount: 15 }],
      promotions: [{ code: "B2G1" }, { code: "B2G1" }],
      total: 100.5,
    })
    expect(b).toEqual({
      subtotal: 115.5,
      shippingTotal: 15,
      discountTotal: 30,
      shippingMethodName: "Aramex",
      promotionCodes: ["B2G1"],
    })
  })

  it("never reports a negative discount", () => {
    const b = computeOrderBreakdown({
      items: [{ quantity: 1, unit_price: 40 }],
      shippingMethods: [{ name: "Pickup", amount: 0 }],
      total: 40.01,
    })
    expect(b.discountTotal).toBe(0)
    expect(b.shippingTotal).toBe(0)
  })
})

describe("order-placed email totals", () => {
  const base = {
    name: "Cam",
    orderDisplayId: "1042",
    items: [{ title: "Stout", quantity: 3, unit_price: 30 }],
    total: 75,
    currencyCode: "aud",
    isPickup: false,
    storeUrl: "https://example.com",
  }

  it("renders subtotal, shipping, discount and total", async () => {
    const out = await renderEmail(OrderPlaced as any, {
      ...base,
      subtotal: 90,
      shippingTotal: 15,
      discountTotal: 30,
      shippingMethodName: "Aramex",
      promotionCodes: ["B2G1"],
    })
    expect(out.html).toContain("Subtotal")
    expect(out.html).toContain("Shipping · Aramex")
    expect(out.html).toContain("$15.00")
    expect(out.html).toContain("Discount (B2G1)")
    expect(out.html).toContain("$30.00")
    expect(out.html).toContain("$75.00")
  })

  it("shows Free shipping and hides the discount row when there is none", async () => {
    const out = await renderEmail(OrderPlaced as any, {
      ...base,
      total: 90,
      subtotal: 90,
      shippingTotal: 0,
      discountTotal: 0,
    })
    expect(out.html).toContain("Free")
    expect(out.html).not.toContain("Discount")
  })

  it("owner alert includes the breakdown", () => {
    const { text } = buildOwnerOrderAlert(
      {
        orderId: "order_1",
        orderDisplayId: "1042",
        customerEmail: "a@b.test",
        customerName: "Cam",
        items: base.items,
        total: 75,
        subtotal: 90,
        shippingTotal: 15,
        discountTotal: 30,
        shippingMethodName: "Aramex",
        promotionCodes: ["B2G1"],
        currencyCode: "aud",
        isPickup: false,
        isCash: false,
        isPayId: true,
      },
      "https://admin.example.com"
    )
    expect(text).toContain("Subtotal: $90.00")
    expect(text).toContain("Shipping (Aramex): $15.00")
    expect(text).toContain("Discount (B2G1): -$30.00")
    expect(text).toContain("Total: $75.00")
  })
})
