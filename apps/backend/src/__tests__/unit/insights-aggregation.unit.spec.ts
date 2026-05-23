describe("insights aggregation — unit (pure logic)", () => {
  describe("abandoned cart filter", () => {
    const isAbandoned = (cart: { updated_at: string; items: any[]; completed_at: string | null }) => {
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
      const submitted = customers.filter(
        (c) => c.metadata?.status != null
      ).length
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
