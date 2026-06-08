import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

jest.setTimeout(120_000)

medusaIntegrationTestRunner({
  disableAutoTeardown: true,
  testSuite: ({ getContainer }) => {
    describe("wishlist-alerts C6 schema + uniqueness", () => {
      it("persists stock_alert_sent and defaults it to false", async () => {
        const container = getContainer()
        const wishlist = container.resolve("wishlist") as any
        const created = await wishlist.createWishlists({
          customer_id: "wl_c1",
          product_id: "wl_p1",
          mode: "buy_later",
          stock_threshold: 3,
        })
        const row = Array.isArray(created) ? created[0] : created
        expect(row.stock_alert_sent).toBe(false)

        await wishlist.updateWishlists({ id: row.id, stock_alert_sent: true })
        const [reread] = await wishlist.listWishlists({ id: row.id })
        expect(reread.stock_alert_sent).toBe(true)
      })

      it("enforces uniqueness per (customer_id, product_id, mode)", async () => {
        const container = getContainer()
        const wishlist = container.resolve("wishlist") as any
        await wishlist.createWishlists({
          customer_id: "wl_c2",
          product_id: "wl_p2",
          mode: "buy_later",
        })
        await expect(
          wishlist.createWishlists({
            customer_id: "wl_c2",
            product_id: "wl_p2",
            mode: "buy_later",
          })
        ).rejects.toBeDefined()
      })

      it("allows the same product in different modes", async () => {
        const container = getContainer()
        const wishlist = container.resolve("wishlist") as any
        await wishlist.createWishlists({
          customer_id: "wl_c3",
          product_id: "wl_p3",
          mode: "buy_later",
        })
        const second = await wishlist.createWishlists({
          customer_id: "wl_c3",
          product_id: "wl_p3",
          mode: "buy_at_price",
          target_price: 25,
        })
        expect(second).toBeDefined()
      })
    })
  },
})
