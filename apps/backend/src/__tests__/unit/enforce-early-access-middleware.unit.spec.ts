import { enforceAccessOnCartAdd } from "../../api/store/middlewares/enforce-access-on-cart-add"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const HOUR_MS = 60 * 60 * 1000

// Fixed reference point: T = earlyAccessUntil
// now = T − 1.5h → approved (T−1h) is still locked, VIP5 (T−24h) is open
const T = new Date("2026-06-10T12:00:00.000Z")
const NOW_LOCKED = new Date(T.getTime() - 1.5 * HOUR_MS) // 10:30Z — approved locked

type ReqOptions = {
  tier?: string | null
  variantId?: string | null
  quantity?: number
  earlyAccessUntil?: string | null
  queryThrows?: boolean
}

function makeReq(opts: ReqOptions = {}) {
  const {
    tier = "approved",
    variantId = "var_test_1",
    quantity = 1,
    earlyAccessUntil = null,
    queryThrows = false,
  } = opts

  const metadata = earlyAccessUntil !== null ? { early_access_until: earlyAccessUntil } : {}

  return {
    customer_tier: tier,
    body: variantId !== null ? { variant_id: variantId, quantity } : {},
    scope: {
      resolve(key: string) {
        if (key === ContainerRegistrationKeys.QUERY) {
          if (queryThrows) throw new Error("query lookup failed")
          return {
            graph: async () => ({
              data: [{ product: { id: "prod_test_1", metadata } }],
            }),
          }
        }
        throw new Error(`unknown key: ${key}`)
      },
    },
  }
}

describe("enforceAccessOnCartAdd", () => {
  let next: jest.Mock
  let res: { status: jest.Mock; json: jest.Mock }

  beforeEach(() => {
    next = jest.fn()
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("calls next immediately when no variant_id in body", async () => {
    const req = makeReq({ variantId: null })
    await enforceAccessOnCartAdd(req as any, res as any, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("calls next when quantity = 0 (removal, not an add)", async () => {
    const req = makeReq({ quantity: 0 })
    await enforceAccessOnCartAdd(req as any, res as any, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("calls next when product has no early_access_until", async () => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW_LOCKED)
    const req = makeReq({ tier: "approved", earlyAccessUntil: null })
    await enforceAccessOnCartAdd(req as any, res as any, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("returns 409 when approved customer is before their 1h window", async () => {
    // NOW_LOCKED = T−1.5h; approved window opens at T−1h → still locked
    jest.useFakeTimers()
    jest.setSystemTime(NOW_LOCKED)
    const req = makeReq({ tier: "approved", earlyAccessUntil: T.toISOString() })
    await enforceAccessOnCartAdd(req as any, res as any, next)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "access_not_yet_available",
        your_tier: "approved",
        available_at: T.toISOString(),
      })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 409 for anonymous customer (null tier) before public time", async () => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW_LOCKED)
    const req = makeReq({ tier: null, earlyAccessUntil: T.toISOString() })
    await enforceAccessOnCartAdd(req as any, res as any, next)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(next).not.toHaveBeenCalled()
  })

  it("calls next for vip5 at the same time approved is blocked (24h window)", async () => {
    // VIP5 window: T−24h = 2026-06-09T12:00Z. NOW_LOCKED = T−1.5h → well past vip5 open
    jest.useFakeTimers()
    jest.setSystemTime(NOW_LOCKED)
    const req = makeReq({ tier: "vip5", earlyAccessUntil: T.toISOString() })
    await enforceAccessOnCartAdd(req as any, res as any, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("calls next when now >= earlyAccessUntil (product is public)", async () => {
    const nowPublic = new Date(T.getTime() + 1000) // 1s after public
    jest.useFakeTimers()
    jest.setSystemTime(nowPublic)
    const req = makeReq({ tier: null, earlyAccessUntil: T.toISOString() })
    await enforceAccessOnCartAdd(req as any, res as any, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("calls next when query.graph throws (fail-open behaviour)", async () => {
    // Gate should never block when the lookup fails — Medusa's normal validation still runs
    const req = makeReq({ queryThrows: true, earlyAccessUntil: "2099-01-01T00:00:00Z" })
    await enforceAccessOnCartAdd(req as any, res as any, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })
})
