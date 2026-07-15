import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  createRestockAlertWorkflow,
  deleteRestockAlertWorkflow,
} from "../../src/workflows/manage-restock-alert"

jest.setTimeout(120_000)

medusaIntegrationTestRunner({
  disableAutoTeardown: true,
  testSuite: ({ getContainer }) => {
    describe("restock-alert workflow (C4/C5/X1)", () => {
      const customerId = "cust_restock_it_1"

      it("persists the real model fields (not the old variant_id/threshold/vip_tier)", async () => {
        const container = getContainer()
        const svc = container.resolve("restockAlert") as any

        const { result } = await createRestockAlertWorkflow(container).run({
          input: {
            customer_id: customerId,
            product_id: "prod_restock_1",
            beer_name: "Hazy Days IPA",
            brewery_name: "Test Brewery",
          },
        })

        expect(result.created).toBe(true)
        const [row] = await svc.listRestockAlerts({ id: result.alert.id })
        expect(row.beer_name).toBe("Hazy Days IPA")
        expect(row.brewery_name).toBe("Test Brewery")
        expect(row.product_id).toBe("prod_restock_1")
        // tier defaults to "approved" when the customer has no VIP score.
        expect(row.tier_at_notification).toBe("approved")
        expect(row.notified_at).toBeNull()
      })

      it("dedupes by (customer_id, product_id) — no duplicate rows", async () => {
        const container = getContainer()
        const svc = container.resolve("restockAlert") as any

        // Medusa 2.17 restores the DB snapshot before each test (beforeEach),
        // so we must create the first alert inside this test — not rely on the
        // previous test's data which has been wiped.
        await createRestockAlertWorkflow(container).run({
          input: {
            customer_id: customerId,
            product_id: "prod_restock_1",
            beer_name: "Hazy Days IPA",
            brewery_name: "Test Brewery",
          },
        })

        // Second invocation with identical input should dedup — created: false.
        const { result } = await createRestockAlertWorkflow(container).run({
          input: {
            customer_id: customerId,
            product_id: "prod_restock_1",
            beer_name: "Hazy Days IPA",
            brewery_name: "Test Brewery",
          },
        })

        expect(result.created).toBe(false)
        // Fetch all alerts for this (customer, product) pair; filter notified_at
        // IS NULL in JS to avoid MikroORM 6.6+ null-filter quirks.
        const allRows = await svc.listRestockAlerts({
          customer_id: customerId,
          product_id: "prod_restock_1",
        })
        const rows = allRows.filter((r: any) => !r.notified_at)
        expect(rows.length).toBe(1)
      })

      it("captures the customer's current VIP tier into tier_at_notification", async () => {
        const container = getContainer()
        const svc = container.resolve("restockAlert") as any
        const vip = container.resolve("vipScore") as any

        await vip.createVipScores({ customer_id: "cust_vip_5", current_tier: "vip5" })

        const { result } = await createRestockAlertWorkflow(container).run({
          input: {
            customer_id: "cust_vip_5",
            product_id: "prod_restock_2",
            beer_name: "Triple IPA",
            brewery_name: "Test Brewery",
          },
        })

        const [row] = await svc.listRestockAlerts({ id: result.alert.id })
        expect(row.tier_at_notification).toBe("vip5")
      })

      it("delete workflow enforces ownership", async () => {
        const container = getContainer()
        const svc = container.resolve("restockAlert") as any

        const { result } = await createRestockAlertWorkflow(container).run({
          input: {
            customer_id: "cust_del_1",
            product_id: "prod_del_1",
            beer_name: "Delete Me",
            brewery_name: "Test Brewery",
          },
        })
        const id = result.alert.id

        // Wrong owner -> workflow rejects; row must survive.
        await expect(
          deleteRestockAlertWorkflow(container).run({
            input: { id, customer_id: "someone_else" },
          })
        ).rejects.toBeDefined()
        expect((await svc.listRestockAlerts({ id })).length).toBe(1)

        // Correct owner -> removed.
        await deleteRestockAlertWorkflow(container).run({
          input: { id, customer_id: "cust_del_1" },
        })
        expect((await svc.listRestockAlerts({ id })).length).toBe(0)
      })
    })
  },
})
