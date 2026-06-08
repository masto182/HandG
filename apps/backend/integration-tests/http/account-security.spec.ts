import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"

jest.setTimeout(120_000)

medusaIntegrationTestRunner({
  disableAutoTeardown: true,
  testSuite: ({ api, getContainer }) => {
    describe("Account security — email-change + password", () => {
      let publishableKey = ""
      let customerJwt = ""
      let customerId = ""
      const email = "security-test@uat.dev"
      const password = "SecurityTest123!"

      beforeAll(async () => {
        const container = getContainer()
        const customerModule = container.resolve(Modules.CUSTOMER) as any
        const apiKeyModule = container.resolve(Modules.API_KEY) as any
        const salesChannelModule = container.resolve(Modules.SALES_CHANNEL) as any

        // Publishable key
        let [channel] = await salesChannelModule.listSalesChannels({})
        if (!channel) channel = await salesChannelModule.createSalesChannels({ name: "Default" })
        const key = await apiKeyModule.createApiKeys({
          title: "sec-uat-pk",
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

        // Ensure pending group exists
        const [pg] = await customerModule.listCustomerGroups({ name: "pending" })
        if (!pg) await customerModule.createCustomerGroups({ name: "pending" })

        // Register customer and login
        // Step 1: register auth identity, capture the one-time registration token
        let registrationToken = ""
        try {
          const regRes = await api.post("/auth/customer/emailpass/register", { email, password })
          registrationToken = regRes.data.token ?? ""
        } catch {}
        try {
          // Step 2: create customer record — requires the registration token as Bearer
          await api.post(
            "/store/customers/register",
            {
              email,
              first_name: "Security",
              last_name: "Tester",
              date_of_birth: "1990-01-01",
              why_join: "Integration test",
              favourite_brewery: "Test",
            },
            {
              headers: {
                "x-publishable-api-key": publishableKey,
                ...(registrationToken ? { authorization: `Bearer ${registrationToken}` } : {}),
              },
            }
          )
        } catch {}

        const authRes = await api.post("/auth/customer/emailpass", { email, password })
        customerJwt = authRes.data.token

        const [cust] = await customerModule.listCustomers({ email })
        if (cust) customerId = cust.id
      })

      const authHeaders = () => ({
        "x-publishable-api-key": publishableKey,
        authorization: `Bearer ${customerJwt}`,
      })

      describe("POST /store/customers/me/email-change-request", () => {
        it("200 + ok:true on valid new_email", async () => {
          const res = await api.post(
            "/store/customers/me/email-change-request",
            { new_email: `security-changed-${Date.now()}@uat.dev` },
            { headers: authHeaders() }
          )
          expect(res.status).toBe(200)
          expect(res.data.ok).toBe(true)
          expect(res.data.expires_at).toBeDefined()
        })

        it("400 on invalid email format", async () => {
          try {
            await api.post(
              "/store/customers/me/email-change-request",
              { new_email: "not-an-email" },
              { headers: authHeaders() }
            )
            expect(true).toBe(false)
          } catch (err: any) {
            expect(err.response.status).toBe(400)
          }
        })

        it("409 when new_email belongs to another customer", async () => {
          // Register a second customer to occupy the email
          const otherEmail = `other-${Date.now()}@uat.dev`
          let otherRegToken = ""
          try {
            const regRes = await api.post("/auth/customer/emailpass/register", {
              email: otherEmail,
              password: "Other123!",
            })
            otherRegToken = regRes.data.token ?? ""
          } catch {}
          try {
            await api.post(
              "/store/customers/register",
              {
                email: otherEmail,
                first_name: "Other",
                last_name: "User",
                date_of_birth: "1990-01-01",
                why_join: "test",
                favourite_brewery: "Test",
              },
              {
                headers: {
                  "x-publishable-api-key": publishableKey,
                  ...(otherRegToken ? { authorization: `Bearer ${otherRegToken}` } : {}),
                },
              }
            )
          } catch {}

          try {
            await api.post(
              "/store/customers/me/email-change-request",
              { new_email: otherEmail },
              { headers: authHeaders() }
            )
            expect(true).toBe(false)
          } catch (err: any) {
            expect(err.response.status).toBe(409)
          }
        })

        it("401 when unauthenticated", async () => {
          try {
            await api.post(
              "/store/customers/me/email-change-request",
              { new_email: "anon@test.dev" },
              { headers: { "x-publishable-api-key": publishableKey } }
            )
            expect(true).toBe(false)
          } catch (err: any) {
            expect([401, 403]).toContain(err.response.status)
          }
        })
      })

      describe("POST /store/email-change/confirm", () => {
        it("404 on unknown token", async () => {
          try {
            await api.post(
              "/store/email-change/confirm",
              { token: "not-a-real-token-abc123" },
              { headers: authHeaders() }
            )
            expect(true).toBe(false)
          } catch (err: any) {
            expect(err.response.status).toBe(404)
          }
        })

        it("410 on expired token", async () => {
          if (!customerId) return
          const container = getContainer()
          const svc = container.resolve("emailChangeRequest") as any

          // Insert an expired token directly
          const expiredToken = await svc.createRequest(customerId, `expired-${Date.now()}@uat.dev`)
          // Manually expire it by updating expires_at to the past
          const [row] = await svc.listEmailChangeRequests({ token: expiredToken.token })
          if (row) {
            await svc.updateEmailChangeRequests({
              id: row.id,
              expires_at: new Date(Date.now() - 1000),
            })
          }

          try {
            await api.post(
              "/store/email-change/confirm",
              { token: expiredToken.token },
              { headers: authHeaders() }
            )
            expect(true).toBe(false)
          } catch (err: any) {
            expect(err.response.status).toBe(410)
          }
        })
      })

      describe("POST /store/customers/me/password", () => {
        it("401 on wrong old password", async () => {
          try {
            await api.post(
              "/store/customers/me/password",
              { old_password: "WrongPassword!", new_password: "NewSecurePassword123!" },
              { headers: authHeaders() }
            )
            expect(true).toBe(false)
          } catch (err: any) {
            expect([401, 400]).toContain(err.response.status)
          }
        })

        it("400 when new password < 12 chars", async () => {
          try {
            await api.post(
              "/store/customers/me/password",
              { old_password: password, new_password: "short" },
              { headers: authHeaders() }
            )
            expect(true).toBe(false)
          } catch (err: any) {
            expect(err.response.status).toBe(400)
          }
        })

        it("400 when new password equals old", async () => {
          try {
            await api.post(
              "/store/customers/me/password",
              { old_password: password, new_password: password },
              { headers: authHeaders() }
            )
            expect(true).toBe(false)
          } catch (err: any) {
            expect(err.response.status).toBe(400)
          }
        })

        it("200 on correct old password + valid new password", async () => {
          const newPassword = "NewSecurePassword456!"
          const res = await api.post(
            "/store/customers/me/password",
            { old_password: password, new_password: newPassword },
            { headers: authHeaders() }
          )
          expect(res.status).toBe(200)
          expect(res.data.ok).toBe(true)

          // Verify can login with new password
          const loginRes = await api.post("/auth/customer/emailpass", {
            email,
            password: newPassword,
          })
          expect(loginRes.data.token).toBeDefined()
        })
      })
    })
  },
})
