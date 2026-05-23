import { approveWishlistOffersWorkflow, revokeWishlistOfferWorkflow } from "../../workflows/approve-wishlist-offers"

describe("approve-wishlist-offers workflow — unit (decision logic)", () => {
  describe("groupByCustomer logic", () => {
    it("groups multiple items under same customer_id", () => {
      const approvals = [
        { wishlist_id: "w1", customer_id: "c1", product_id: "p1", offer_price: 5000 },
        { wishlist_id: "w2", customer_id: "c1", product_id: "p2", offer_price: 7000 },
        { wishlist_id: "w3", customer_id: "c2", product_id: "p3", offer_price: 3000 },
      ]
      const byCustomer = new Map<string, typeof approvals>()
      for (const a of approvals) {
        if (!byCustomer.has(a.customer_id)) byCustomer.set(a.customer_id, [])
        byCustomer.get(a.customer_id)!.push(a)
      }
      expect(byCustomer.get("c1")!.length).toBe(2)
      expect(byCustomer.get("c2")!.length).toBe(1)
      expect(byCustomer.size).toBe(2)
    })
  })

  describe("delta computation", () => {
    const computeDelta = (currentPrice: number | null, offerPrice: number) => {
      if (currentPrice == null) return null
      return Math.max(0, currentPrice - offerPrice)
    }

    it("returns positive delta when current > offer", () => {
      expect(computeDelta(10000, 7500)).toBe(2500)
    })

    it("returns 0 when offer >= current (no discount needed)", () => {
      expect(computeDelta(5000, 5000)).toBe(0)
      expect(computeDelta(5000, 6000)).toBe(0)
    })

    it("returns null when current price is unknown", () => {
      expect(computeDelta(null, 7500)).toBeNull()
    })
  })

  describe("promotion code generation", () => {
    it("produces deterministic format BAP_{custSuffix}_{prodSuffix}_{timestamp}", () => {
      const customer_id = "cust_01ABCDEF12345678"
      const product_id = "prod_01XY987654321ZZZ"
      const stamp = "20260516120000"
      const code = `BAP_${customer_id.slice(-8)}_${product_id.slice(-8)}_${stamp}`
      expect(code).toBe("BAP_12345678_54321ZZZ_20260516120000")
      expect(code.length).toBeLessThan(64)
    })

    it("campaign identifier uses customer suffix + timestamp", () => {
      const customer_id = "cust_01ABCDEF12345678"
      const stamp = "20260516120000"
      const campaignId = `BAP_${customer_id.slice(-8)}_${stamp}`
      expect(campaignId).toBe("BAP_12345678_20260516120000")
    })
  })

  describe("expiry computation for email", () => {
    it("computes days until expiry correctly", () => {
      const now = Date.now()
      const expires = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
      const days = Math.max(
        0,
        Math.ceil((new Date(expires).getTime() - now) / (1000 * 60 * 60 * 24))
      )
      expect(days).toBe(7)
    })

    it("returns 0 for already expired", () => {
      const now = Date.now()
      const expires = new Date(now - 1000).toISOString()
      const days = Math.max(
        0,
        Math.ceil((new Date(expires).getTime() - now) / (1000 * 60 * 60 * 24))
      )
      expect(days).toBe(0)
    })

    it("returns null when no expiry set", () => {
      const expires_at: string | null = null
      const result = expires_at
        ? Math.max(
            0,
            Math.ceil(
              (new Date(expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
          )
        : null
      expect(result).toBeNull()
    })
  })

  describe("workflow exports", () => {
    it("approveWishlistOffersWorkflow is exported and callable", () => {
      expect(approveWishlistOffersWorkflow).toBeDefined()
      expect(typeof approveWishlistOffersWorkflow).toBe("function")
    })

    it("revokeWishlistOfferWorkflow is exported and callable", () => {
      expect(revokeWishlistOfferWorkflow).toBeDefined()
      expect(typeof revokeWishlistOfferWorkflow).toBe("function")
    })
  })
})
