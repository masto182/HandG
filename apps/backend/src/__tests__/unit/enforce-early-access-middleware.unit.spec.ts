import {
  enforceAccessOnCartAdd,
  enforceAccessOnCartComplete,
} from "../../api/store/middlewares/enforce-access-on-cart-add"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const HOUR_MS = 60 * 60 * 1000

// Release (VIP5/VIP4 unlock) at R; VIP3 R+12h; VIP2 R+18h; VIP1 R+21h; approved R+24h.
const R = new Date("2026-06-10T08:00:00.000Z")
const at = (h: number) => new Date(R.getTime() + h * HOUR_MS)

type ReqOptions = {
  tier?: string | null
  body?: Record<string, any>
  url?: string
  releaseAt?: string | null
  lines?: Array<{ id: string; variant_id: string; quantity: number }>
  queryThrows?: boolean
}

function makeReq(opts: ReqOptions = {}) {
  const {
    tier = "approved",
    body = { variant_id: "var_1", quantity: 1 },
    url = "/store/carts/cart_1/line-items",
    releaseAt = R.toISOString(),
    lines = [{ id: "line_1", variant_id: "var_1", quantity: 1 }],
    queryThrows = false,
  } = opts
  const metadata = releaseAt !== null ? { release_at: releaseAt } : {}

  return {
    customer_tier: tier,
    body,
    originalUrl: url,
    params: {},
    scope: {
      resolve(key: string) {
        if (key === ContainerRegistrationKeys.QUERY) {
          if (queryThrows) throw new Error("query lookup failed")
          return {
            graph: async ({ entity }: { entity: string }) =>
              entity === "cart"
                ? { data: [{ id: "cart_1", items: lines }] }
                : {
                    data: [{ id: "var_1", product: { id: "prod_1", title: "Hazy One", metadata } }],
                  },
          }
        }
        throw new Error(`unknown key: ${key}`)
      },
    },
  }
}

describe("early-access cart enforcement", () => {
  let next: jest.Mock
  let res: { status: jest.Mock; json: jest.Mock }

  beforeEach(() => {
    next = jest.fn()
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  })

  afterEach(() => jest.useRealTimers())

  const setNow = (d: Date) => {
    jest.useFakeTimers()
    jest.setSystemTime(d)
  }

  const ladder: Array<[string | null, number]> = [
    ["vip5", 0],
    ["vip4", 0],
    ["vip3", 12],
    ["vip2", 18],
    ["vip1", 21],
    ["approved", 24],
    [null, 24],
  ]

  it.each(ladder)("add: %s blocked just before release+%ih, allowed at it", async (tier, h) => {
    setNow(new Date(at(h).getTime() - 1000))
    await enforceAccessOnCartAdd(makeReq({ tier }) as any, res as any, next)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "access_not_yet_available",
        unlock_at: at(h).toISOString(),
        items: [expect.objectContaining({ title: "Hazy One" })],
      })
    )
    expect(next).not.toHaveBeenCalled()

    next.mockClear()
    res.status.mockClear()
    setNow(at(h))
    await enforceAccessOnCartAdd(makeReq({ tier }) as any, res as any, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("add: no release metadata -> allowed", async () => {
    await enforceAccessOnCartAdd(makeReq({ releaseAt: null }) as any, res as any, next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it("add: unparseable release -> blocked (fails closed)", async () => {
    await enforceAccessOnCartAdd(
      makeReq({ releaseAt: "nope", tier: "vip5" }) as any,
      res as any,
      next
    )
    expect(res.status).toHaveBeenCalledWith(409)
  })

  it("add: lookup failure -> blocked (fails closed)", async () => {
    await enforceAccessOnCartAdd(makeReq({ queryThrows: true }) as any, res as any, next)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(next).not.toHaveBeenCalled()
  })

  it("quantity increase on a locked line -> blocked", async () => {
    setNow(at(1))
    const req = makeReq({
      tier: "vip3",
      url: "/store/carts/cart_1/line-items/line_1",
      body: { quantity: 3 },
    })
    await enforceAccessOnCartAdd(req as any, res as any, next)
    expect(res.status).toHaveBeenCalledWith(409)
  })

  it("quantity decrease or removal on a locked line -> allowed", async () => {
    setNow(at(1))
    for (const quantity of [1, 0]) {
      next.mockClear()
      const req = makeReq({
        tier: "vip3",
        url: "/store/carts/cart_1/line-items/line_1",
        body: { quantity },
        lines: [{ id: "line_1", variant_id: "var_1", quantity: 2 }],
      })
      await enforceAccessOnCartAdd(req as any, res as any, next)
      expect(next).toHaveBeenCalledTimes(1)
    }
  })

  it("complete: locked item in cart -> checkout blocked until it unlocks", async () => {
    setNow(at(23))
    const req = makeReq({ tier: "approved", url: "/store/carts/cart_1/complete", body: {} })
    await enforceAccessOnCartComplete(req as any, res as any, next)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ unlock_at: at(24).toISOString() })
    )

    next.mockClear()
    setNow(at(24))
    await enforceAccessOnCartComplete(req as any, res as any, next)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
