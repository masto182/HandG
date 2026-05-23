import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"

jest.setTimeout(120_000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("POST /store/customers/register", () => {
      let publishableKey = ""

      beforeAll(async () => {
        const container = getContainer()
        const customerModule = container.resolve(Modules.CUSTOMER) as any

        // Ensure the "pending" customer group exists so assign-customer-group can find it.
        const [existing] = await customerModule.listCustomerGroups({
          name: "pending",
        })
        if (!existing) {
          await customerModule.createCustomerGroups({ name: "pending" })
        }

        // Store routes require an enabled publishable API key. Create one and
        // associate it to the first sales channel (or create one if missing).
        const apiKeyModule = container.resolve(Modules.API_KEY) as any
        const salesChannelModule = container.resolve(Modules.SALES_CHANNEL) as any

        let [channel] = await salesChannelModule.listSalesChannels({})
        if (!channel) {
          channel = await salesChannelModule.createSalesChannels({
            name: "Default",
          })
        }

        const key = await apiKeyModule.createApiKeys({
          title: "uat-pk",
          type: "publishable",
          created_by: "uat",
        } as any)
        publishableKey = key.token
        // Link the publishable key to the sales channel via the link module.
        const link = container.resolve("link") as any
        try {
          await link.create({
            api_key: { publishable_key_id: key.id },
            sales_channel: { sales_channel_id: channel.id },
          })
        } catch {
          // Some Medusa minor versions expose the link API differently;
          // the test still proceeds — if the association is missing the
          // register route will fail loudly and we'll diagnose.
        }
      })

      it("rejects without a registration Bearer token", async () => {
        try {
          const res = await api.post(
            "/store/customers/register",
            {
              email: "nobear@test.dev",
              first_name: "No",
              last_name: "Bear",
              date_of_birth: "1990-01-01",
              why_join: "testing",
              favourite_brewery: "testing",
            },
            { headers: { "x-publishable-api-key": publishableKey } }
          )
          // Some Medusa responses don't throw; assert the status code here too.
          expect([400, 401]).toContain(res.status)
        } catch (err: any) {
          // authenticate middleware rejects → 401; publishable-key gate → 400.
          expect([400, 401]).toContain(err.response?.status)
        }
      })

      it("registers, links auth identity, and puts the customer in the pending group", async () => {
        const email = `uat-${Date.now()}@test.dev`
        const password = "Uat12345!"

        const regRes = await api.post(`/auth/customer/emailpass/register`, {
          email,
          password,
        })
        expect(regRes.status).toBe(200)
        const token = (regRes.data as any).token as string
        expect(typeof token).toBe("string")

        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64").toString("utf8")
        )
        const authIdentityId = payload.auth_identity_id
        expect(typeof authIdentityId).toBe("string")

        const res = await api.post(
          "/store/customers/register",
          {
            email,
            first_name: "Uat",
            last_name: "Tester",
            date_of_birth: "1990-05-05",
            why_join: "Testing the workflow",
            favourite_brewery: "Hop & Glory",
          },
          {
            headers: {
              authorization: `Bearer ${token}`,
              "x-publishable-api-key": publishableKey,
            },
          }
        )

        if (res.status !== 201) {
          // eslint-disable-next-line no-console
          console.error("[UAT] register response:", res.status, res.data)
        }
        expect(res.status).toBe(201)
        expect((res.data as any).customer.email).toBe(email)

        const container = getContainer()
        const authModule = container.resolve(Modules.AUTH) as any
        const customerModule = container.resolve(Modules.CUSTOMER) as any

        const identity = await authModule.retrieveAuthIdentity(authIdentityId)
        const customerId = identity?.app_metadata?.customer_id
        expect(customerId).toBe((res.data as any).customer.id)

        const relations = await customerModule.listCustomerGroupCustomers({
          customer_id: customerId,
        })
        const groupIds = relations.map((r: any) => r.customer_group_id)
        const groups = await customerModule.listCustomerGroups({ id: groupIds })
        const groupNames = groups.map((g: any) => g.name)
        expect(groupNames).toContain("pending")
      })
    })
  },
})
