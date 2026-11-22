import { getLineStockStatus, getUnavailableLineIds } from "./stock"

describe("stock availability", () => {
  const managed = {
    available: 2,
    manage_inventory: true,
    allow_backorder: false,
  }

  it("identifies sold-out and insufficient lines", () => {
    expect(
      getLineStockStatus("v1", 1, {
        v1: { ...managed, available: 0 },
      }),
    ).toEqual({ kind: "sold_out" })
    expect(getLineStockStatus("v1", 3, { v1: managed })).toEqual({
      kind: "insufficient",
      available: 2,
    })
  })

  it("does not block unmanaged or backorder-enabled variants", () => {
    expect(
      getLineStockStatus("v1", 10, {
        v1: { ...managed, available: 0, manage_inventory: false },
      }),
    ).toEqual({ kind: "available" })
    expect(
      getLineStockStatus("v1", 10, {
        v1: { ...managed, available: 0, allow_backorder: true },
      }),
    ).toEqual({ kind: "available" })
  })

  it("returns only unavailable line ids", () => {
    expect(
      getUnavailableLineIds(
        [
          { id: "line-1", variant_id: "v1", quantity: 1 },
          { id: "line-2", variant_id: "v2", quantity: 1 },
        ],
        { v1: { ...managed, available: 0 }, v2: managed },
      ),
    ).toEqual(["line-1"])
  })
})
