import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { markNotificationReadWorkflow } from "../../src/workflows/manage-notification"

jest.setTimeout(120_000)

medusaIntegrationTestRunner({
  disableAutoTeardown: true,
  testSuite: ({ getContainer }) => {
    describe("notification mark-read (H1 IDOR + update signature)", () => {
      const ownerId = "cust_notif_owner_1"
      const attackerId = "cust_notif_attacker_1"

      async function makeNotification(container: any, customerId: string) {
        const svc = container.resolve("inbox") as any
        const [n] = await svc.createNotifications([
          {
            customer_id: customerId,
            type: "restock_alert",
            title: "Back in stock",
            body: "Your beer is back",
          },
        ])
        return n
      }

      it("marks the OWNER's notification read (validates {id, read} signature)", async () => {
        const container = getContainer()
        const svc = container.resolve("inbox") as any
        const n = await makeNotification(container, ownerId)
        expect(n.read).toBe(false)

        await markNotificationReadWorkflow(container).run({
          input: { id: n.id, customer_id: ownerId },
        })

        const reloaded = await svc.retrieveNotification(n.id)
        expect(reloaded.read).toBe(true)
      })

      it("rejects marking ANOTHER customer's notification read (IDOR closed)", async () => {
        const container = getContainer()
        const svc = container.resolve("inbox") as any
        const n = await makeNotification(container, ownerId)

        await expect(
          markNotificationReadWorkflow(container).run({
            input: { id: n.id, customer_id: attackerId },
          })
        ).rejects.toBeDefined()

        // The victim's notification must remain unread.
        const reloaded = await svc.retrieveNotification(n.id)
        expect(reloaded.read).toBe(false)
      })
    })
  },
})
