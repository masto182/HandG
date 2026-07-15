import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createAdminAuth } from "../helpers/admin-auth"

jest.setTimeout(120_000)

medusaIntegrationTestRunner({
  disableAutoTeardown: true,
  testSuite: ({ api, getContainer }) => {
    describe("site-config admin + store APIs", () => {
      let adminAuth: { headers: Record<string, string> }
      let publishableKey = ""

      beforeAll(async () => {
        const container = getContainer()

        // Create an admin user + session token (token carries actor_id).
        adminAuth = await createAdminAuth(api, container)

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
        // Medusa 2.17 restores the DB snapshot before each test, so the override
        // and history row written in the PATCH test are gone. Re-run the PATCH
        // here so the history entry exists when we read it.
        await api.patch("/admin/site-config/payid_alias", { value: "alias@override.au" }, adminAuth)
        const res = await api.get("/admin/site-config/payid_alias/history", adminAuth)
        expect(res.status).toBe(200)
        const history = (res.data as any).history as any[]
        expect(history.length).toBeGreaterThan(0)
        expect(history[0].key).toBe("payid_alias")
        expect(history[0].action).toBe("set")
        expect(history[0].value_new).toBe("alias@override.au")
      })

      it("DELETE reverts to env or default and source is no longer 'override'", async () => {
        const res = await api.delete("/admin/site-config/payid_alias", adminAuth)
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
        // payid_hold_hours and email_orders_to are intentionally public
        expect(config.payid_hold_hours).toBeDefined()
        expect(config.email_orders_to).toBeDefined()
        // genuinely private keys must not leak
        expect(config.email_from).toBeUndefined()
        expect(config.vip_thresholds).toBeUndefined()
      })

      it("GET /admin/site-config/:key for unknown key → 404", async () => {
        try {
          const res = await api.get("/admin/site-config/this_key_does_not_exist", adminAuth)
          expect(res.status).toBe(404)
        } catch (err: any) {
          expect(err.response?.status).toBe(404)
        }
      })
    })
  },
})
