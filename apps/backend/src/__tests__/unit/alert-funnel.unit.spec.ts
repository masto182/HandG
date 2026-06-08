import { computeFunnel, computeByKind, DispatchRow } from "../../api/admin/alerts/route"

function row(overrides: Partial<DispatchRow> = {}): DispatchRow {
  return {
    id: `d_${Math.random()}`,
    customer_id: "c1",
    product_id: "p1",
    kind: "brewery",
    email_sent: true,
    clicked_at: null,
    viewed_at: null,
    carted_at: null,
    ordered_at: null,
    order_id: null,
    ...overrides,
  }
}

const now = new Date().toISOString()

describe("computeFunnel", () => {
  it("returns zeros for empty input", () => {
    const f = computeFunnel([])
    expect(f.dispatched).toBe(0)
    expect(f.overall_rate).toBe(0)
  })

  it("counts each stage correctly", () => {
    const dispatches = [
      row({ clicked_at: now, viewed_at: now, carted_at: now, ordered_at: now, order_id: "o1" }),
      row({ clicked_at: now, viewed_at: now, carted_at: now }),
      row({ clicked_at: now }),
      row(),
    ]
    const f = computeFunnel(dispatches)
    expect(f.dispatched).toBe(4)
    expect(f.clicked).toBe(3)
    expect(f.carted).toBe(2)
    expect(f.ordered).toBe(1)
    expect(f.click_rate).toBe(75)
    expect(f.overall_rate).toBe(25)
  })

  it("cart rate denominates from clicked not dispatched", () => {
    const dispatches = [
      row({ clicked_at: now, carted_at: now }),
      row({ clicked_at: now, carted_at: now }),
      row(),
      row(),
    ]
    const f = computeFunnel(dispatches)
    expect(f.cart_rate).toBe(100)
  })
})

describe("computeByKind", () => {
  it("groups correctly and computes per-kind rates", () => {
    const dispatches = [
      row({ kind: "hop", clicked_at: now, ordered_at: now, order_id: "o1" }),
      row({ kind: "hop" }),
      row({ kind: "brewery", clicked_at: now }),
      row({ kind: "all_new" }),
    ]
    const bk = computeByKind(dispatches)
    const hop = bk.find((k) => k.kind === "hop")!
    expect(hop.dispatched).toBe(2)
    expect(hop.ordered).toBe(1)
    expect(hop.order_rate).toBe(50)
    const brewery = bk.find((k) => k.kind === "brewery")!
    expect(brewery.clicked).toBe(1)
    expect(brewery.ordered).toBe(0)
  })
})
