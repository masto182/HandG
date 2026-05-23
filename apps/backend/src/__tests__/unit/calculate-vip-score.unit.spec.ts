import { calculateVipScore } from "../../workflows/steps/calculate-vip-score"

type Order = {
  id: string
  customer_id: string
  total: number
  created_at: string
  payment_status?: string
}

function buildDeps(opts: {
  now: Date
  ordersByCustomer: Record<string, Order[]>
  referralsByReferrer: Record<string, Array<{ referred_customer_id: string; stealth_mode?: boolean }>>
  existing?: Array<{ id: string }>
}) {
  const updates: any[] = []
  const creates: any[] = []

  return {
    deps: {
      query: {
        async graph({ filters }: any) {
          const cid = filters?.customer_id
          return { data: opts.ordersByCustomer[cid] || [] }
        },
      },
      referralService: {
        async listReferrals(filters: any) {
          const list = opts.referralsByReferrer[filters.referrer_customer_id] || []
          if (filters.stealth_mode === false) {
            return list.filter((r) => !r.stealth_mode)
          }
          return list
        },
      },
      vipScoreService: {
        async listVipScores() {
          return opts.existing || []
        },
        async updateVipScores(id: string, data: any) {
          updates.push({ id, data })
        },
        async createVipScores(data: any) {
          creates.push(data)
        },
      },
    },
    updates,
    creates,
  }
}

const now = new Date("2026-05-08T00:00:00.000Z")
const inWindow = "2026-04-01T00:00:00.000Z" // 37 days ago - inside 3-month window
const outsideWindow = "2026-01-01T00:00:00.000Z" // >3 months ago

describe("calculateVipScore", () => {
  it("Case A: personal spend only", async () => {
    const { deps, creates } = buildDeps({
      now,
      ordersByCustomer: {
        A: [
          { id: "o1", customer_id: "A", total: 300, created_at: inWindow, payment_status: "captured" },
        ],
      },
      referralsByReferrer: {},
    })

    const out = await calculateVipScore({ customer_id: "A" }, deps, now)
    expect(out.personal_spend).toBe(300)
    expect(out.direct_referral_spend).toBe(0)
    expect(out.indirect_referral_spend).toBe(0)
    expect(out.vip_score).toBe(300)
    expect(out.order_count_window).toBe(1)
    expect(creates).toHaveLength(1)
  })

  it("Case B: personal + direct referral (0.2x)", async () => {
    const { deps } = buildDeps({
      now,
      ordersByCustomer: {
        A: [{ id: "a1", customer_id: "A", total: 100, created_at: inWindow, payment_status: "captured" }],
        B: [{ id: "b1", customer_id: "B", total: 200, created_at: inWindow, payment_status: "captured" }],
      },
      referralsByReferrer: {
        A: [{ referred_customer_id: "B" }],
      },
    })

    const out = await calculateVipScore({ customer_id: "A" }, deps, now)
    expect(out.personal_spend).toBe(100)
    expect(out.direct_referral_spend).toBe(200)
    expect(out.indirect_referral_spend).toBe(0)
    expect(out.vip_score).toBe(100 + 0.2 * 200) // 140
  })

  it("Case C: personal + direct + indirect (2-hop, 0.1x)", async () => {
    const { deps } = buildDeps({
      now,
      ordersByCustomer: {
        A: [{ id: "a1", customer_id: "A", total: 100, created_at: inWindow, payment_status: "captured" }],
        B: [{ id: "b1", customer_id: "B", total: 200, created_at: inWindow, payment_status: "captured" }],
        C: [{ id: "c1", customer_id: "C", total: 500, created_at: inWindow, payment_status: "captured" }],
      },
      referralsByReferrer: {
        A: [{ referred_customer_id: "B" }],
        B: [{ referred_customer_id: "C" }],
      },
    })

    const out = await calculateVipScore({ customer_id: "A" }, deps, now)
    expect(out.personal_spend).toBe(100)
    expect(out.direct_referral_spend).toBe(200)
    expect(out.indirect_referral_spend).toBe(500)
    // 100 + 0.2*200 + 0.1*500 = 190
    expect(out.vip_score).toBeCloseTo(190, 5)
  })

  it("Case D: orders outside 3-month window are excluded", async () => {
    const { deps } = buildDeps({
      now,
      ordersByCustomer: {
        A: [
          { id: "old", customer_id: "A", total: 999, created_at: outsideWindow, payment_status: "captured" },
          { id: "new", customer_id: "A", total: 50, created_at: inWindow, payment_status: "captured" },
        ],
      },
      referralsByReferrer: {},
    })

    const out = await calculateVipScore({ customer_id: "A" }, deps, now)
    expect(out.personal_spend).toBe(50)
    expect(out.vip_score).toBe(50)
  })

  it("Case E: uncaptured orders are excluded (PayID hold shouldn't inflate)", async () => {
    const { deps } = buildDeps({
      now,
      ordersByCustomer: {
        A: [
          { id: "paid", customer_id: "A", total: 100, created_at: inWindow, payment_status: "captured" },
          { id: "pending", customer_id: "A", total: 500, created_at: inWindow, payment_status: "pending" },
          { id: "authed", customer_id: "A", total: 300, created_at: inWindow, payment_status: "authorized" },
          { id: "no_status", customer_id: "A", total: 200, created_at: inWindow },
        ],
      },
      referralsByReferrer: {},
    })

    const out = await calculateVipScore({ customer_id: "A" }, deps, now)
    expect(out.personal_spend).toBe(100)
    expect(out.order_count_window).toBe(1)
  })

  it("Case F: stealth-mode referrals are excluded", async () => {
    const { deps } = buildDeps({
      now,
      ordersByCustomer: {
        A: [],
        B: [{ id: "b1", customer_id: "B", total: 300, created_at: inWindow, payment_status: "captured" }],
        C: [{ id: "c1", customer_id: "C", total: 400, created_at: inWindow, payment_status: "captured" }],
      },
      referralsByReferrer: {
        A: [
          { referred_customer_id: "B", stealth_mode: false },
          { referred_customer_id: "C", stealth_mode: true },
        ],
      },
    })

    const out = await calculateVipScore({ customer_id: "A" }, deps, now)
    expect(out.direct_referral_spend).toBe(300)
  })

  it("Case G: updates existing row instead of creating a new one", async () => {
    const { deps, updates, creates } = buildDeps({
      now,
      ordersByCustomer: {
        A: [{ id: "o1", customer_id: "A", total: 10, created_at: inWindow, payment_status: "captured" }],
      },
      referralsByReferrer: {},
      existing: [{ id: "vs_existing" }],
    })

    await calculateVipScore({ customer_id: "A" }, deps, now)
    expect(creates).toHaveLength(0)
    expect(updates).toHaveLength(1)
    expect(updates[0].id).toBe("vs_existing")
    expect(updates[0].data.personal_spend_12mo).toBe(10)
  })
})
