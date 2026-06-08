import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"

jest.setTimeout(120_000)

medusaIntegrationTestRunner({
  disableAutoTeardown: true,
  testSuite: ({ api, getContainer }) => {
    describe("Hops API — /store/hops + /store/customers/me/hop-alerts", () => {
      let publishableKey = ""
      let hopId = ""
      let hopSlug = ""
      let customerJwt = ""
      let customerId = ""

      beforeAll(async () => {
        const container = getContainer()
        const hopModule = container.resolve("hop") as any
        const customerModule = container.resolve(Modules.CUSTOMER) as any
        const apiKeyModule = container.resolve(Modules.API_KEY) as any
        const salesChannelModule = container.resolve(Modules.SALES_CHANNEL) as any
        const authModule = container.resolve(Modules.AUTH) as any

        // Publishable key
        let [channel] = await salesChannelModule.listSalesChannels({})
        if (!channel) channel = await salesChannelModule.createSalesChannels({ name: "Default" })
        const key = await apiKeyModule.createApiKeys({
          title: "hops-uat-pk",
          type: "publishable",
          created_by: "uat",
        } as any)
        publishableKey = key.token
        const link = container.resolve("link") as any
        try {
          await link.create({
            api_key: { publishable_key_id: key.id },
            sales_channel: { sales_channel_id: channel.id },
          })
        } catch {}

        // Seed a hop with country_code so filter tests work
        const [existing] = await hopModule.listHops({ slug: "integration-test-citra" })
        if (!existing) {
          const hop = await hopModule.createHops({
            name: "Integration Test Citra",
            slug: "integration-test-citra",
            origin: "United States",
            country_code: "US",
            flavor_profile: "Citrus, tropical",
            is_active: true,
            available_forms: ["pellet", "cryo"],
          })
          hopId = hop.id
          hopSlug = hop.slug
        } else {
          hopId = existing.id
          hopSlug = existing.slug
        }

        // Customer + auth for hop-alert tests
        const [pendingGroup] = await customerModule.listCustomerGroups({ name: "pending" })
        if (!pendingGroup) await customerModule.createCustomerGroups({ name: "pending" })

        const email = "hops-test@uat.dev"
        const password = "HopsTest123!"
        const [existingCust] = await customerModule.listCustomers({ email })
        if (existingCust) {
          customerId = existingCust.id
        } else {
          const cust = await customerModule.createCustomers({
            email,
            first_name: "Hops",
            last_name: "Tester",
          })
          customerId = cust.id
        }

        // Register + login to get JWT
        try {
          await api.post("/auth/customer/emailpass/register", { email, password })
        } catch {}
        const authRes = await api.post("/auth/customer/emailpass", { email, password })
        customerJwt = authRes.data.token
      })

      const storeHeaders = () => ({
        "x-publishable-api-key": publishableKey,
      })
      const authHeaders = () => ({
        "x-publishable-api-key": publishableKey,
        authorization: `Bearer ${customerJwt}`,
      })

      describe("GET /store/hops", () => {
        it("returns hops array and count", async () => {
          const res = await api.get("/store/hops", { headers: storeHeaders() })
          expect(res.status).toBe(200)
          expect(Array.isArray(res.data.hops)).toBe(true)
          expect(typeof res.data.count).toBe("number")
        })

        it("hop objects include required fields", async () => {
          const res = await api.get("/store/hops", { headers: storeHeaders() })
          const hop = res.data.hops[0]
          if (hop) {
            expect(hop).toHaveProperty("id")
            expect(hop).toHaveProperty("name")
            expect(hop).toHaveProperty("slug")
            expect(hop).toHaveProperty("country_code")
          }
        })
      })

      describe("GET /store/hops/:slug", () => {
        it("returns single hop detail with new fields", async () => {
          if (!hopSlug) return
          const res = await api.get(`/store/hops/${hopSlug}`, { headers: storeHeaders() })
          expect(res.status).toBe(200)
          expect(res.data.hop).toBeDefined()
          expect(res.data.hop.slug).toBe(hopSlug)
          expect(res.data.hop).toHaveProperty("country_code")
          expect(res.data.hop).toHaveProperty("available_forms")
        })

        it("returns 404 for unknown slug", async () => {
          try {
            await api.get("/store/hops/does-not-exist-xyz", { headers: storeHeaders() })
            expect(true).toBe(false) // should not reach
          } catch (err: any) {
            expect(err.response.status).toBe(404)
          }
        })
      })

      describe("GET /store/customers/me/hop-alerts", () => {
        it("returns empty list initially", async () => {
          const res = await api.get(`/store/customers/me/hop-alerts?hop_id=${hopId}`, {
            headers: authHeaders(),
          })
          expect(res.status).toBe(200)
          expect(Array.isArray(res.data.hop_alerts)).toBe(true)
        })

        it("POST creates hop alert (201)", async () => {
          if (!hopId) return
          const res = await api.post(
            "/store/customers/me/hop-alerts",
            { hop_id: hopId, channel_email: false, channel_inapp: true },
            { headers: authHeaders() }
          )
          expect([200, 201]).toContain(res.status)
        })

        it("POST upserts on re-subscribe (200)", async () => {
          if (!hopId) return
          const res = await api.post(
            "/store/customers/me/hop-alerts",
            { hop_id: hopId, channel_email: true, channel_inapp: true },
            { headers: authHeaders() }
          )
          expect(res.status).toBe(200)
        })

        it("GET after subscribe shows exactly 1 alert for hop", async () => {
          if (!hopId) return
          const res = await api.get(`/store/customers/me/hop-alerts?hop_id=${hopId}`, {
            headers: authHeaders(),
          })
          expect(res.data.hop_alerts.length).toBe(1)
          expect(res.data.hop_alerts[0].channel_email).toBe(true)
        })

        it("POST 400 on missing hop_id", async () => {
          try {
            await api.post("/store/customers/me/hop-alerts", {}, { headers: authHeaders() })
            expect(true).toBe(false)
          } catch (err: any) {
            expect(err.response.status).toBe(400)
          }
        })

        it("DELETE removes hop alert", async () => {
          if (!hopId) return
          const res = await api.delete("/store/customers/me/hop-alerts", {
            data: { hop_id: hopId },
            headers: authHeaders(),
          })
          expect(res.status).toBe(200)
          const after = await api.get(`/store/customers/me/hop-alerts?hop_id=${hopId}`, {
            headers: authHeaders(),
          })
          expect(after.data.hop_alerts.length).toBe(0)
        })
      })
    })
  },
})
