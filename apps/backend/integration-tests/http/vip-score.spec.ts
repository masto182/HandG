import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import evaluateVipDemotionWorkflow from "../../src/workflows/evaluate-vip-demotion"
import evaluateVipProgressionWorkflow from "../../src/workflows/evaluate-vip-progression"

jest.setTimeout(120_000)

medusaIntegrationTestRunner({
  disableAutoTeardown: true,
  testSuite: ({ getContainer }) => {
    describe("vip-score H8/C7/X3", () => {
      it("enforces a unique vip_score per customer (H8)", async () => {
        const container = getContainer()
        const vip = container.resolve("vipScore") as any

        await vip.createVipScores({ customer_id: "cust_uniq_1", current_tier: "approved" })

        await expect(
          vip.createVipScores({ customer_id: "cust_uniq_1", current_tier: "vip2" })
        ).rejects.toBeDefined()

        const rows = await vip.listVipScores({ customer_id: "cust_uniq_1" })
        expect(rows.length).toBe(1)
      })

      it("revokes active buy-at-price offers when a customer is demoted (X3)", async () => {
        const container = getContainer()
        const vip = container.resolve("vipScore") as any
        const wishlist = container.resolve("wishlist") as any
        const promotionModule = container.resolve("promotion") as any

        // Customer sitting at vip1 with an expired demotion warning + no spend
        // -> the demotion workflow will demote them to "approved".
        const warnedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        await vip.createVipScores({
          customer_id: "cust_demote_x3",
          current_tier: "vip1",
          vip_score: 0,
          pending_demotion: true,
          demotion_warning_at: warnedAt,
        })

        // A real promotion to deactivate.
        let promotionId: string | null = null
        try {
          const [promo] = await promotionModule.createPromotions([
            { code: "BAP_X3_TEST", type: "standard", status: "active" },
          ])
          promotionId = promo.id
        } catch {
          promotionId = null
        }

        const [offer] = [
          await wishlist.createWishlists({
            customer_id: "cust_demote_x3",
            product_id: "prod_x3",
            mode: "buy_at_price",
            admin_approved_offer: true,
            admin_offer_price: 30,
            promotion_id: promotionId,
            promotion_code: "BAP_X3_TEST",
          }),
        ]
        const offerId = Array.isArray(offer) ? offer[0].id : offer.id

        const { result } = await evaluateVipDemotionWorkflow(container).run({
          input: { customer_id: "cust_demote_x3" },
        })
        expect((result as any).action).toBe("demoted")

        // Tier dropped + offer revoked.
        const [score] = await vip.listVipScores({ customer_id: "cust_demote_x3" })
        expect(score.current_tier).toBe("approved")

        const [reread] = await wishlist.listWishlists({ id: offerId })
        expect(reread.admin_approved_offer).toBe(false)
        expect(reread.promotion_id).toBeNull()

        if (promotionId) {
          const [p] = await promotionModule.listPromotions({ id: promotionId })
          expect(p.status).toBe("inactive")
        }
      })

      it("keeps a single consistent row under concurrent progression + demotion (C7)", async () => {
        const container = getContainer()
        const vip = container.resolve("vipScore") as any

        await vip.createVipScores({ customer_id: "cust_race_1", current_tier: "vip2" })

        await Promise.allSettled([
          evaluateVipProgressionWorkflow(container).run({ input: { customer_id: "cust_race_1" } }),
          evaluateVipDemotionWorkflow(container).run({ input: { customer_id: "cust_race_1" } }),
        ])

        const rows = await vip.listVipScores({ customer_id: "cust_race_1" })
        expect(rows.length).toBe(1)
        expect(["approved", "vip1", "vip2", "vip3", "vip4", "vip5"]).toContain(rows[0].current_tier)
      })
    })
  },
})
