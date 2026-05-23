import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

jest.setTimeout(120_000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("site-config admin + store APIs", () => {
      let adminAuth: { headers: Record<string, string> }
      let publishableKey = ""

      beforeAll(async () => {
        const container = getContainer()

        // Create an admin user + token for /admin routes
        const userModule = container.resolve("user") as any
        const authModule = container.resolve("auth") as any

        // Reuse or create admin user
        const email = `admin-siteconfig-${Date.now()}@test.dev`
        const password = "Admin123!"
        try {
          const reg = await api.post("/auth/user/emailpass/register", {
            email,
            password,
          })
          const token = (reg.data as any).token as string
          // Need to invite via admin to actually create a user; instead create directly:
          const user = await userModule.createUsers({ email, first_name: "T", last_name: "Admin" })
          await authModule.updateAuthIdentities({
            selector: { app_metadata: { user_id: user.id } } as any,
            data: {},
          }).catch(() => {})
          // Sign in to get a session token
          const auth = await api.post("/auth/user/emailpass", { email, password })
          adminAuth = { headers: { authorization: `Bearer ${(auth.data as any).token}` } }
        } catch (e) {
          // Fallback: many test runners ship with a default admin
          adminAuth = { headers: {} }
        }

        // Publishable key for /store/* routes
        const apiKeyModule = container.resolve("api_key") as any
        const salesChannelModule = container.resolve("sales_channel") as any
        let [channel] = await salesChannelModule.listSalesChannels({})
        if (!channel) {
          channel = await salesChannelModule.createSalesChannels({ name: "Default" })
        }
        const key = await apiKeyModule.createApiKeys({
          title: "site-config-test-pk",
          type: "publishable",
          created_by: "test",
        } as any)
        publishableKey = key.token

        const link = container.resolve("link") as any
        try {
          await link.create({
            api_key: { publishable_key_id: key.id },
            sales_channel: { sales_channel_id: channel.id },
          })
        } catch {}
      })

      it("GET /admin/site-config returns the registry with default source", async () => {
        const res = await api.get("/admin/site-config", adminAuth)
        expect(res.status).toBe(200)
        const entries = (res.data as any).entries as any[]
        expect(Array.isArray(entries)).toBe(true)
        const payid = entries.find((e) => e.key === "payid_alias")
        expect(payid).toBeDefined()
        expect(["default", "env"]).toContain(payid.source)
        expect(payid.isPublic).toBe(true)
      })

      it("PATCH /admin/site-config/payid_alias sets override and returns source:'override'", async () => {
        const res = await api.patch(
          "/admin/site-config/payid_alias",
          { value: "alias@override.au" },
          adminAuth
        )
        expect(res.status).toBe(200)
        const entry = (res.data as any).entry
        expect(entry.effective).toBe("alias@override.au")
        expect(entry.source).toBe("override")
      })

      it("PATCH with invalid type → 400", async () => {
        try {
          const res = await api.patch(
            "/admin/site-config/payid_hold_hours",
            { value: -5 },
            adminAuth
          )
          expect(res.status).toBe(400)
        } catch (err: any) {
          expect(err.response?.status).toBe(400)
        }
      })

      it("GET /admin/site-config/:key/history shows the prior set", async () => {
        const res = await api.get(
          "/admin/site-config/payid_alias/history",
          adminAuth
        )
        expect(res.status).toBe(200)
        const history = (res.data as any).history as any[]
        expect(history.length).toBeGreaterThan(0)
        expect(history[0].key).toBe("payid_alias")
        expect(history[0].action).toBe("set")
        expect(history[0].value_new).toBe("alias@override.au")
      })

      it("DELETE reverts to env or default and source is no longer 'override'", async () => {
        const res = await api.delete(
          "/admin/site-config/payid_alias",
          adminAuth
        )
        expect(res.status).toBe(200)
        const entry = (res.data as any).entry
        expect(["env", "default"]).toContain(entry.source)
      })

      it("GET /store/site-config/public returns only public keys", async () => {
        const res = await api.get("/store/site-config/public", {
          headers: { "x-publishable-api-key": publishableKey },
        })
        expect(res.status).toBe(200)
        const config = (res.data as any).config
        expect(config.payid_alias).toBeDefined()
        expect(config.site_name).toBeDefined()
        // non-public keys must not leak
        expect(config.payid_hold_hours).toBeUndefined()
        expect(config.email_from).toBeUndefined()
        expect(config.email_orders_to).toBeUndefined()
        expect(config.vip_thresholds).toBeUndefined()
      })

      it("GET /admin/site-config/:key for unknown key → 404", async () => {
        try {
          const res = await api.get(
            "/admin/site-config/this_key_does_not_exist",
            adminAuth
          )
          expect(res.status).toBe(404)
        } catch (err: any) {
          expect(err.response?.status).toBe(404)
        }
      })
    })
  },
})
