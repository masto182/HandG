import { calculateReferralSpendPoints } from "../../workflows/steps/calculate-vip-score"

const now = new Date("2026-05-08T00:00:00.000Z")
const inWindow = "2026-04-01T00:00:00.000Z"
const outsideWindow = "2026-01-01T00:00:00.000Z"
const captured = [{ status: "completed", captured_amount: 1 }]

function order(customer_id: string, total: number, created_at = inWindow, paid = true) {
  return {
    id: `${customer_id}-${total}-${created_at}`,
    customer_id,
    total,
    created_at,
    payment_collections: paid ? captured : [{ status: "awaiting", captured_amount: 0 }],
  }
}

function deps(
  ordersByCustomer: Record<string, any[]>,
  referralsByReferrer: Record<
    string,
    Array<{ referred_customer_id: string; stealth_mode?: boolean }>
  >
) {
  return {
    query: {
      async graph({ filters }: any) {
        return { data: ordersByCustomer[filters?.customer_id] || [] }
      },
    },
    referralService: {
      async listReferrals(filters: any) {
        const list = referralsByReferrer[filters.referrer_customer_id] || []
        return filters.stealth_mode === false ? list.filter((r) => !r.stealth_mode) : list
      },
    },
  }
}

describe("calculateReferralSpendPoints", () => {
  it("credits 20% of each referee's captured spend and 10% of their referees' spend", async () => {
    const result = await calculateReferralSpendPoints(
      "A",
      deps(
        {
          B: [order("B", 200), order("B", 100, outsideWindow), order("B", 50, inWindow, false)],
          C: [order("C", 400)],
          D: [order("D", 300)],
        },
        {
          A: [{ referred_customer_id: "B" }, { referred_customer_id: "C" }],
          B: [{ referred_customer_id: "D" }],
        }
      ),
      now
    )

    expect(result.get("B")).toBe(70)
    expect(result.get("C")).toBe(80)
    expect(result.size).toBe(2)
  })

  it("excludes stealth referrals at both hops", async () => {
    const result = await calculateReferralSpendPoints(
      "A",
      deps(
        { B: [order("B", 100)], C: [order("C", 100)], D: [order("D", 100)] },
        {
          A: [{ referred_customer_id: "B" }, { referred_customer_id: "C", stealth_mode: true }],
          B: [{ referred_customer_id: "D", stealth_mode: true }],
        }
      ),
      now
    )

    expect(result.get("B")).toBe(20)
    expect(result.has("C")).toBe(false)
  })
})
