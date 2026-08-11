import { StoreEventRequestSchema } from "../../api/store/events/validators"

describe("StoreEventRequestSchema", () => {
  it("accepts a known checkout event payload", () => {
    const result = StoreEventRequestSchema.safeParse({
      event_type: "checkout.fulfilment_selected",
      session_id: "4b3f3f15-7f25-43f8-b867-3ea62c5c0e68",
      payload: {
        cart_id: "cart_123",
        method: "pickup",
        pickup_option_id: "shipopt_123",
        pickup_location_name: "Alexandria",
      },
    })

    expect(result.success).toBe(true)
  })

  it("rejects unknown event types", () => {
    const result = StoreEventRequestSchema.safeParse({
      event_type: "totally.fake",
      session_id: "4b3f3f15-7f25-43f8-b867-3ea62c5c0e68",
      payload: {},
    })

    expect(result.success).toBe(false)
  })

  it("rejects oversized payloads", () => {
    const result = StoreEventRequestSchema.safeParse({
      event_type: "filter.applied",
      session_id: "4b3f3f15-7f25-43f8-b867-3ea62c5c0e68",
      payload: {
        filters: {
          brewery: "x".repeat(513),
        },
      },
    })

    expect(result.success).toBe(false)
  })

  it("rejects client-injected fields outside the per-event schema", () => {
    const result = StoreEventRequestSchema.safeParse({
      event_type: "order.confirmation_viewed",
      session_id: "4b3f3f15-7f25-43f8-b867-3ea62c5c0e68",
      payload: {
        order_id: "order_123",
        customer_id: "cust_bad",
      },
    })

    expect(result.success).toBe(false)
  })
})
