import orderPaymentCapturedHandler from "../../subscribers/order-payment-captured"

describe("orderPaymentCapturedHandler", () => {
  it("creates an order.completed analytics event with a server session key", async () => {
    const createStorefrontEvents = jest.fn().mockResolvedValue(undefined)
    const query = {
      graph: jest
        .fn()
        .mockResolvedValueOnce({ data: [{ id: "pay_1", payment_collection_id: "pc_1" }] })
        .mockResolvedValueOnce({ data: [{ order_id: "order_1" }] })
        .mockResolvedValueOnce({
          data: [{ id: "order_1", customer_id: "cust_1", total: 19900, currency_code: "aud" }],
        })
        .mockResolvedValueOnce({ data: [{ order_id: "order_1", cart_id: "cart_1" }] }),
    }

    const container = {
      resolve(key: string) {
        if (key === "logger") {
          return { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
        }
        if (key === "query") return query
        if (key === "referral") {
          return { listReferrals: jest.fn().mockResolvedValue([]) }
        }
        if (key === "analytics") {
          return { createStorefrontEvents }
        }
        throw new Error(`Unexpected resolve: ${key}`)
      },
    } as any

    await orderPaymentCapturedHandler({
      event: { data: { id: "pay_1" } },
      container,
    } as any)

    expect(createStorefrontEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        event_type: "order.completed",
        session_id: "server:order:order_1",
        customer_id: "cust_1",
        payload: expect.objectContaining({
          order_id: "order_1",
          cart_id: "cart_1",
          total: 19900,
          currency_code: "aud",
          source: "payment.captured",
        }),
      }),
    ])
  })

  it("falls back to payment data cart identifiers when order_cart linkage is absent", async () => {
    const createStorefrontEvents = jest.fn().mockResolvedValue(undefined)
    const query = {
      graph: jest
        .fn()
        .mockResolvedValueOnce({
          data: [
            { id: "pay_1", payment_collection_id: "pc_1", data: { cart_id: "cart_from_payment" } },
          ],
        })
        .mockResolvedValueOnce({ data: [{ order_id: "order_1" }] })
        .mockResolvedValueOnce({
          data: [{ id: "order_1", customer_id: "cust_1", total: 19900, currency_code: "aud" }],
        })
        .mockResolvedValueOnce({ data: [] }),
    }

    const container = {
      resolve(key: string) {
        if (key === "logger") {
          return { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
        }
        if (key === "query") return query
        if (key === "referral") {
          return { listReferrals: jest.fn().mockResolvedValue([]) }
        }
        if (key === "analytics") {
          return { createStorefrontEvents }
        }
        throw new Error(`Unexpected resolve: ${key}`)
      },
    } as any

    await orderPaymentCapturedHandler({
      event: { data: { id: "pay_1" } },
      container,
    } as any)

    expect(createStorefrontEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        payload: expect.objectContaining({
          cart_id: "cart_from_payment",
        }),
      }),
    ])
  })
})
