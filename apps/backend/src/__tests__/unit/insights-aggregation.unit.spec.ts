import {
  buildCheckoutFunnel,
  buildFilterDrilldown,
  buildMemberActivity,
  buildProductDrilldown,
} from "../../modules/analytics/lib/insights"
import {
  mergeSessionCustomers,
  sessionToCustomerMap,
} from "../../modules/analytics/lib/merge-session-customers"

describe("insights aggregation — unit (pure logic)", () => {
  describe("session merge", () => {
    it("attributes anonymous rows when a session has one customer", () => {
      const events = mergeSessionCustomers([
        { session_id: "s1", customer_id: null, event_type: "cart.viewed" } as any,
        { session_id: "s1", customer_id: "cust_1", event_type: "product.viewed" } as any,
      ])

      expect(events[0].customer_id).toBe("cust_1")
    })

    it("does not attribute ambiguous sessions", () => {
      const map = sessionToCustomerMap([
        { session_id: "s1", customer_id: "cust_1" },
        { session_id: "s1", customer_id: "cust_2" },
      ])

      expect(map.has("s1")).toBe(false)
    })
  })

  describe("checkout funnel", () => {
    it("counts delivery and pickup sessions through payment-confirmed completion", () => {
      const events = [
        {
          event_type: "cart.viewed",
          session_id: "s1",
          customer_id: "c1",
          created_at: "2026-08-01T00:00:00Z",
        },
        {
          event_type: "checkout.step_reached",
          session_id: "s1",
          customer_id: "c1",
          created_at: "2026-08-01T00:01:00Z",
          payload: { step: "fulfilment", cart_id: "cart_1" },
        },
        {
          event_type: "checkout.fulfilment_selected",
          session_id: "s1",
          customer_id: "c1",
          created_at: "2026-08-01T00:02:00Z",
          payload: { method: "delivery", cart_id: "cart_1" },
        },
        {
          event_type: "checkout.address_submitted",
          session_id: "s1",
          customer_id: "c1",
          created_at: "2026-08-01T00:03:00Z",
          payload: { cart_id: "cart_1" },
        },
        {
          event_type: "checkout.shipping_method_selected",
          session_id: "s1",
          customer_id: "c1",
          created_at: "2026-08-01T00:04:00Z",
          payload: { cart_id: "cart_1" },
        },
        {
          event_type: "checkout.step_reached",
          session_id: "s1",
          customer_id: "c1",
          created_at: "2026-08-01T00:05:00Z",
          payload: { step: "payment", cart_id: "cart_1" },
        },
        {
          event_type: "checkout.step_reached",
          session_id: "s1",
          customer_id: "c1",
          created_at: "2026-08-01T00:06:00Z",
          payload: { step: "review", cart_id: "cart_1" },
        },
        {
          event_type: "order.completed",
          session_id: "server:order:o1",
          customer_id: "c1",
          created_at: "2026-08-01T00:07:00Z",
          payload: { order_id: "o1", cart_id: "cart_1" },
        },
        {
          event_type: "cart.viewed",
          session_id: "s2",
          customer_id: "c2",
          created_at: "2026-08-01T01:00:00Z",
        },
        {
          event_type: "checkout.step_reached",
          session_id: "s2",
          customer_id: "c2",
          created_at: "2026-08-01T01:01:00Z",
          payload: { step: "fulfilment", cart_id: "cart_2" },
        },
        {
          event_type: "checkout.fulfilment_selected",
          session_id: "s2",
          customer_id: "c2",
          created_at: "2026-08-01T01:02:00Z",
          payload: { method: "pickup", cart_id: "cart_2" },
        },
        {
          event_type: "checkout.step_reached",
          session_id: "s2",
          customer_id: "c2",
          created_at: "2026-08-01T01:03:00Z",
          payload: { step: "payment", cart_id: "cart_2" },
        },
      ] as any

      const funnel = buildCheckoutFunnel(events)

      expect(funnel.total_sessions).toBe(2)
      expect(funnel.completed_orders).toBe(1)
      expect(funnel.stages.find((stage) => stage.key === "cart")?.count).toBe(2)
      expect(funnel.stages.find((stage) => stage.key === "completed")?.count).toBe(1)
    })

    it("uses only delivery sessions that reached fulfilment as the address denominator", () => {
      const events = [
        {
          event_type: "cart.viewed",
          session_id: "s1",
          customer_id: "c1",
          created_at: "2026-08-01T00:00:00Z",
        },
        {
          event_type: "checkout.step_reached",
          session_id: "s1",
          customer_id: "c1",
          created_at: "2026-08-01T00:01:00Z",
          payload: { step: "fulfilment", cart_id: "cart_1" },
        },
        {
          event_type: "checkout.fulfilment_selected",
          session_id: "s1",
          customer_id: "c1",
          created_at: "2026-08-01T00:02:00Z",
          payload: { method: "delivery", cart_id: "cart_1" },
        },
        {
          event_type: "checkout.address_submitted",
          session_id: "s1",
          customer_id: "c1",
          created_at: "2026-08-01T00:03:00Z",
          payload: { cart_id: "cart_1" },
        },
        {
          event_type: "cart.viewed",
          session_id: "s2",
          customer_id: "c2",
          created_at: "2026-08-01T01:00:00Z",
        },
        {
          event_type: "cart.viewed",
          session_id: "s3",
          customer_id: "c3",
          created_at: "2026-08-01T02:00:00Z",
        },
        {
          event_type: "checkout.step_reached",
          session_id: "s3",
          customer_id: "c3",
          created_at: "2026-08-01T02:01:00Z",
          payload: { step: "fulfilment", cart_id: "cart_3" },
        },
        {
          event_type: "checkout.fulfilment_selected",
          session_id: "s3",
          customer_id: "c3",
          created_at: "2026-08-01T02:02:00Z",
          payload: { method: "pickup", cart_id: "cart_3" },
        },
      ] as any

      const funnel = buildCheckoutFunnel(events)

      expect(funnel.stages.find((stage) => stage.key === "address")?.conversion_rate).toBe(100)
    })
  })

  describe("drill-down aggregation", () => {
    const events = [
      {
        event_type: "product.viewed",
        session_id: "s1",
        customer_id: "c1",
        created_at: "2026-08-01T00:00:00Z",
        payload: { product_id: "prod_1", handle: "beer-1" },
      },
      {
        event_type: "cart.item_added",
        session_id: "s1",
        customer_id: "c1",
        created_at: "2026-08-01T00:01:00Z",
        payload: { product_id: "prod_1", handle: "beer-1" },
      },
      {
        event_type: "filter.applied",
        session_id: "s1",
        customer_id: "c1",
        created_at: "2026-08-01T00:02:00Z",
        payload: { filters: { brewery: "Garage Project", hops: "Motueka,Nelson" } },
      },
      {
        event_type: "filter.applied",
        session_id: "s2",
        customer_id: "c2",
        created_at: "2026-08-01T00:03:00Z",
        payload: { filters: { brewery: "Garage Project" } },
      },
    ] as any

    it("builds per-member activity", () => {
      const activity = buildMemberActivity(events, "c1")

      expect(activity.products[0]).toMatchObject({ product_id: "prod_1", views: 1, cart_adds: 1 })
      expect(activity.filters[0]).toMatchObject({ filter: "brewery", uses: 1 })
    })

    it("reports highest stage reached across sessions instead of the newest session", () => {
      const activity = buildMemberActivity(
        [
          {
            event_type: "cart.viewed",
            session_id: "old-complete",
            customer_id: "c1",
            created_at: "2026-08-01T00:00:00Z",
            payload: { cart_id: "cart_old" },
          },
          {
            event_type: "checkout.step_reached",
            session_id: "old-complete",
            customer_id: "c1",
            created_at: "2026-08-01T00:01:00Z",
            payload: { step: "review", cart_id: "cart_old" },
          },
          {
            event_type: "order.completed",
            session_id: "server:order:old-order",
            customer_id: "c1",
            created_at: "2026-08-01T00:02:00Z",
            payload: { order_id: "old-order", cart_id: "cart_old" },
          },
          {
            event_type: "cart.viewed",
            session_id: "recent-cart",
            customer_id: "c1",
            created_at: "2026-08-02T00:00:00Z",
            payload: { cart_id: "cart_recent" },
          },
        ] as any,
        "c1"
      )

      expect(activity.summary.highest_stage).toBe("completed")
      expect(activity.summary.last_fulfilment_method).toBeNull()
    })

    it("includes recent pre-login session rows once a later session event identifies the customer", () => {
      const activity = buildMemberActivity(
        [
          {
            event_type: "product.viewed",
            session_id: "shared-session",
            customer_id: null,
            created_at: "2026-08-01T00:00:00Z",
            payload: { product_id: "prod_pre", handle: "pre-login" },
          },
          {
            event_type: "cart.viewed",
            session_id: "shared-session",
            customer_id: "c1",
            created_at: "2026-08-01T00:01:00Z",
            payload: { cart_id: "cart_merged" },
          },
        ] as any,
        "c1"
      )

      expect(activity.products[0]).toMatchObject({ product_id: "prod_pre", views: 1 })
      expect(activity.summary.sessions).toBe(1)
    })

    it("builds product drill-down rows", () => {
      const rows = buildProductDrilldown(events, "prod_1")
      expect(rows).toEqual([expect.objectContaining({ customer_id: "c1", views: 1, cart_adds: 1 })])
    })

    it("builds filter drill-down rows", () => {
      const drilldown = buildFilterDrilldown(events, "brewery")
      expect(drilldown.values[0]).toEqual({ value: "Garage Project", count: 2 })
      expect(drilldown.members).toHaveLength(2)
    })
  })

  describe("abandoned cart filter", () => {
    const isAbandoned = (cart: {
      updated_at: string
      items: any[]
      completed_at: string | null
    }) => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
      const hasItems = cart.items.length > 0
      const stale = new Date(cart.updated_at).getTime() < oneDayAgo
      const notCompleted = cart.completed_at == null
      return hasItems && stale && notCompleted
    }

    it("returns true for cart with items, stale >24h, not completed", () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      expect(
        isAbandoned({
          updated_at: twoDaysAgo,
          items: [{ id: "i1" }],
          completed_at: null,
        })
      ).toBe(true)
    })

    it("returns false for cart with no items", () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      expect(
        isAbandoned({
          updated_at: twoDaysAgo,
          items: [],
          completed_at: null,
        })
      ).toBe(false)
    })

    it("returns false for recently updated cart (<24h)", () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      expect(
        isAbandoned({
          updated_at: oneHourAgo,
          items: [{ id: "i1" }],
          completed_at: null,
        })
      ).toBe(false)
    })

    it("returns false for completed cart", () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      expect(
        isAbandoned({
          updated_at: twoDaysAgo,
          items: [{ id: "i1" }],
          completed_at: "2026-05-15T00:00:00.000Z",
        })
      ).toBe(false)
    })

    it("boundary: exactly 24h ago is not stale (uses < not <=)", () => {
      const exactly24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      expect(
        isAbandoned({
          updated_at: exactly24h,
          items: [{ id: "i1" }],
          completed_at: null,
        })
      ).toBe(false)
    })
  })

  describe("tier distribution aggregation", () => {
    const aggregateTiers = (scores: Array<{ current_tier: string }>) => {
      const dist: Record<string, number> = {}
      for (const s of scores) {
        const tier = s.current_tier || "none"
        dist[tier] = (dist[tier] || 0) + 1
      }
      return dist
    }

    it("counts tiers correctly", () => {
      const scores = [
        { current_tier: "vip1" },
        { current_tier: "vip1" },
        { current_tier: "vip2" },
        { current_tier: "vip3" },
      ]
      expect(aggregateTiers(scores)).toEqual({ vip1: 2, vip2: 1, vip3: 1 })
    })

    it("handles empty scores", () => {
      expect(aggregateTiers([])).toEqual({})
    })

    it("uses 'none' for falsy tier values", () => {
      const scores = [{ current_tier: "" }, { current_tier: "vip1" }]
      expect(aggregateTiers(scores)).toEqual({ none: 1, vip1: 1 })
    })
  })

  describe("conversion funnel", () => {
    it("computes applications_submitted as customers with metadata.status set", () => {
      const customers = [
        { metadata: { status: "pending" } },
        { metadata: { status: "approved" } },
        { metadata: null },
        { metadata: {} },
      ]
      const submitted = customers.filter((c) => c.metadata?.status != null).length
      expect(submitted).toBe(2)
    })

    it("computes conversion rate correctly", () => {
      const approved = 8
      const submitted = 20
      const rate = ((approved / submitted) * 100).toFixed(1)
      expect(rate).toBe("40.0")
    })

    it("handles zero submissions gracefully", () => {
      const approved = 0
      const submitted = 0
      const rate = submitted > 0 ? ((approved / submitted) * 100).toFixed(1) : "0"
      expect(rate).toBe("0")
    })
  })

  describe("top wishlist products (top-N)", () => {
    it("returns top 10 sorted by count descending", () => {
      const wishlists = [
        { product_id: "p1" },
        { product_id: "p1" },
        { product_id: "p1" },
        { product_id: "p2" },
        { product_id: "p2" },
        { product_id: "p3" },
      ]
      const counts = new Map<string, number>()
      for (const w of wishlists) {
        counts.set(w.product_id, (counts.get(w.product_id) || 0) + 1)
      }
      const top = Array.from(counts.entries())
        .map(([product_id, count]) => ({ product_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
      expect(top[0]).toEqual({ product_id: "p1", count: 3 })
      expect(top[1]).toEqual({ product_id: "p2", count: 2 })
      expect(top.length).toBe(3)
    })
  })
})
