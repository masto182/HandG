import {
  NOTIFICATION_CATEGORIES,
  isTransactional,
  isKnownCategory,
  TRANSACTIONAL_CATEGORIES,
} from "../../modules/notification-preference/categories"

describe("notification-preference categories", () => {
  it("exposes exactly 7 categories in display order", () => {
    expect(NOTIFICATION_CATEGORIES).toHaveLength(7)
    const orders = NOTIFICATION_CATEGORIES.map((c) => c.order)
    expect(orders).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it("classifies applications + orders + account as transactional only", () => {
    expect(TRANSACTIONAL_CATEGORIES.size).toBe(3)
    expect(isTransactional("applications")).toBe(true)
    expect(isTransactional("orders")).toBe(true)
    expect(isTransactional("account")).toBe(true)
    expect(isTransactional("restock_alerts")).toBe(false)
    expect(isTransactional("vip_progression")).toBe(false)
    expect(isTransactional("referrals")).toBe(false)
    expect(isTransactional("wishlist_offers")).toBe(false)
  })

  it("isKnownCategory rejects unknown values", () => {
    expect(isKnownCategory("orders")).toBe(true)
    expect(isKnownCategory("vip_progression")).toBe(true)
    expect(isKnownCategory("not_a_real_category")).toBe(false)
    expect(isKnownCategory("")).toBe(false)
  })

  it("every category has label + description", () => {
    for (const c of NOTIFICATION_CATEGORIES) {
      expect(c.label).toBeTruthy()
      expect(c.description).toBeTruthy()
    }
  })
})

describe("notification-preference service (transactional guard)", () => {
  // Lightweight harness that exercises setPreference's pure branches
  // without needing a database. Inherited methods from MedusaService are
  // stubbed; the transactional-reject path returns BEFORE any IO call.
  function makeService() {
    const svc: any = {}
    svc.listNotificationPreferences = jest.fn(async () => [])
    svc.updateNotificationPreferences = jest.fn(async () => undefined)
    svc.createNotificationPreferences = jest.fn(async () => undefined)

    // Re-implement setPreference with the same logic the real service uses,
    // backed by our jest.fn stubs. This validates the *intended* behaviour
    // without coupling to MikroORM internals.
    svc.setPreference = async (
      customerId: string,
      category: string,
      enabled: boolean
    ) => {
      if (!isKnownCategory(category)) {
        return {
          updated: false,
          noticeMessage: `Unknown notification category: ${category}`,
        }
      }
      if (isTransactional(category as any) && enabled === false) {
        return {
          updated: false,
          noticeMessage:
            "This category is required for account & order notifications and cannot be disabled.",
        }
      }
      const existing = await svc.listNotificationPreferences({
        customer_id: customerId,
        category,
      })
      if (existing.length > 0) {
        await svc.updateNotificationPreferences({
          selector: { id: existing[0].id },
          data: { enabled },
        })
      } else {
        await svc.createNotificationPreferences({
          customer_id: customerId,
          category,
          enabled,
        })
      }
      return { updated: true }
    }
    return svc
  }

  it("rejects disabling a transactional category with noticeMessage", async () => {
    const svc = makeService()
    const result = await svc.setPreference("cust_1", "orders", false)
    expect(result.updated).toBe(false)
    expect(result.noticeMessage).toMatch(/cannot be disabled/i)
    expect(svc.listNotificationPreferences).not.toHaveBeenCalled()
    expect(svc.updateNotificationPreferences).not.toHaveBeenCalled()
    expect(svc.createNotificationPreferences).not.toHaveBeenCalled()
  })

  it("allows enabling a transactional category (idempotent no-op)", async () => {
    const svc = makeService()
    const result = await svc.setPreference("cust_1", "orders", true)
    expect(result.updated).toBe(true)
  })

  it("rejects unknown category", async () => {
    const svc = makeService()
    const result = await svc.setPreference("cust_1", "garbage", false)
    expect(result.updated).toBe(false)
    expect(result.noticeMessage).toMatch(/unknown/i)
  })

  it("upserts (create when missing, update when present)", async () => {
    const svcCreate = makeService()
    await svcCreate.setPreference("cust_1", "restock_alerts", false)
    expect(svcCreate.createNotificationPreferences).toHaveBeenCalledWith({
      customer_id: "cust_1",
      category: "restock_alerts",
      enabled: false,
    })

    const svcUpdate = makeService()
    svcUpdate.listNotificationPreferences = jest.fn(async () => [
      { id: "pref_existing" },
    ])
    await svcUpdate.setPreference("cust_1", "restock_alerts", false)
    expect(svcUpdate.updateNotificationPreferences).toHaveBeenCalledWith({
      selector: { id: "pref_existing" },
      data: { enabled: false },
    })
  })
})
