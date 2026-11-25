import {
  describeUnavailableItems,
  getLineStockStatus,
  getUnavailableLineActions,
  getUnavailableLineIds,
  getUnavailableLines,
} from "./stock"

describe("getUnavailableLineActions", () => {
  it("removes sold-out lines and reduces short-stock lines", () => {
    const items = [
      { id: "sold", variant_id: "v1", quantity: 1 },
      { id: "short", variant_id: "v2", quantity: 5 },
      { id: "fine", variant_id: "v3", quantity: 1 },
    ]
    const availability = {
      v1: { available: 0, manage_inventory: true, allow_backorder: false },
      v2: { available: 2, manage_inventory: true, allow_backorder: false },
      v3: { available: 9, manage_inventory: true, allow_backorder: false },
    }
    expect(getUnavailableLineActions(items, availability)).toEqual([
      { id: "sold", kind: "remove" },
      { id: "short", kind: "reduce", quantity: 2 },
    ])
  })

  it("returns nothing when every line is available", () => {
    expect(
      getUnavailableLineActions([{ id: "a", variant_id: "v1", quantity: 1 }], {
        v1: { available: 3, manage_inventory: true, allow_backorder: false },
      }),
    ).toEqual([])
  })
})

describe("describeUnavailableItems", () => {
  it("names one, two and many items", () => {
    expect(describeUnavailableItems([])).toBe("")
    expect(describeUnavailableItems(["Dankest Days"])).toBe(
      "Dankest Days is no longer available.",
    )
    expect(describeUnavailableItems(["A", "B"])).toBe(
      "A and B are no longer available.",
    )
    expect(describeUnavailableItems(["A", "B", "C"])).toBe(
      "A, B and C are no longer available.",
    )
  })
})

describe("getUnavailableLines", () => {
  it("returns the full unavailable line objects", () => {
    const items = [
      { id: "l1", variant_id: "v1", quantity: 1, product_title: "Sold" },
      { id: "l2", variant_id: "v2", quantity: 1, product_title: "Fine" },
    ]
    const availability = {
      v1: { available: 0, manage_inventory: true, allow_backorder: false },
      v2: { available: 5, manage_inventory: true, allow_backorder: false },
    }
    expect(
      getUnavailableLines(items, availability).map((i) => i.product_title),
    ).toEqual(["Sold"])
  })
})

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
