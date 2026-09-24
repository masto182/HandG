import { parseMoney, formatMoney, roundMoney, resolveSalePricing } from "../../lib/sale-pricing"

describe("parseMoney", () => {
  it("parses plain numbers and numeric strings", () => {
    expect(parseMoney(42)).toBe(42)
    expect(parseMoney("42")).toBe(42)
    expect(parseMoney("33.75")).toBe(33.75)
  })

  it("tolerates currency symbols, percent signs, commas and whitespace", () => {
    expect(parseMoney(" $45 ")).toBe(45)
    expect(parseMoney("25%")).toBe(25)
    expect(parseMoney("1,250")).toBe(1250)
  })

  it("returns null for empty and unusable input", () => {
    expect(parseMoney("")).toBeNull()
    expect(parseMoney("   ")).toBeNull()
    expect(parseMoney(null)).toBeNull()
    expect(parseMoney(undefined)).toBeNull()
    expect(parseMoney("n/a")).toBeNull()
    expect(parseMoney(Number.NaN)).toBeNull()
    expect(parseMoney(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe("formatMoney / roundMoney", () => {
  it("trims trailing zeros", () => {
    expect(formatMoney(42.5)).toBe("42.5")
    expect(formatMoney(42.0)).toBe("42")
    expect(formatMoney(38.25)).toBe("38.25")
  })

  it("rounds to cents", () => {
    expect(roundMoney(15.600000000000001)).toBe(15.6)
    expect(roundMoney(33.599999999999994)).toBe(33.6)
  })
})

describe("resolveSalePricing — Sale% is authoritative", () => {
  it("recomputes the price from Was x (1 - Sale) and ignores a rounded pasted Price", () => {
    const r = resolveSalePricing({ price: "47", sale: "10%", was: "52" })
    expect(r.price).toBe(46.8)
    expect(r.was).toBe(52)
    expect(r.salePct).toBe(10)
    expect(r.recomputed).toBe(true)
    expect(r.correction).toContain("46.8")
  })

  it("ignores the pasted Price even when it differs materially, not just by rounding", () => {
    // Guards Campbell's chosen precedence: derived always wins when Sale% is present.
    const r = resolveSalePricing({ price: "5", sale: "10%", was: "52" })
    expect(r.price).toBe(46.8)
    expect(r.recomputed).toBe(true)
    expect(r.correction).not.toBeNull()
  })

  it("reports no correction when the pasted Price already matches", () => {
    const r = resolveSalePricing({ price: "46.8", sale: "10", was: "52" })
    expect(r.price).toBe(46.8)
    expect(r.recomputed).toBe(true)
    expect(r.correction).toBeNull()
  })

  it("computes a price when Price is blank entirely", () => {
    const r = resolveSalePricing({ price: "", sale: "25", was: "150" })
    expect(r.price).toBe(112.5)
    expect(r.correction).toContain("(empty)")
  })

  // The exact values from the 2026-08-26 incident: each pasted Price had been
  // rounded to whole dollars, destroying the cents.
  it.each([
    ["Jiangshi", "47", "10", "52", 46.8],
    ["RAR Deadstock", "38", "15", "45", 38.25],
    ["Other Half Buckle Down", "34", "20", "42", 33.6],
    ["Lolev Waves II", "19", "55", "42", 18.9],
    ["Troon Slumbering Wraith", "113", "25", "150", 112.5],
    ["Other Half Broccoli Day", "23", "60", "39", 15.6],
    ["Deep Fried supersonic", "25", "50", "42", 21],
  ])("restores cents for %s", (_name, price, sale, was, expected) => {
    expect(resolveSalePricing({ price, sale, was }).price).toBe(expected)
  })
})

describe("resolveSalePricing — no usable discount", () => {
  it("uses the pasted Price unchanged when Sale is absent", () => {
    const r = resolveSalePricing({ price: "45", sale: "", was: "45" })
    expect(r.price).toBe(45)
    expect(r.was).toBe(45)
    expect(r.salePct).toBeNull()
    expect(r.recomputed).toBe(false)
    expect(r.correction).toBeNull()
  })

  it.each([["0"], ["0%"], ["100"], ["100%"], ["abc"]])("treats Sale=%s as no discount", (sale) => {
    const r = resolveSalePricing({ price: "45", sale, was: "50" })
    expect(r.price).toBe(45)
    expect(r.recomputed).toBe(false)
    expect(r.salePct).toBeNull()
  })

  it("falls back to Price as the base when Was is absent", () => {
    const r = resolveSalePricing({ price: "45", sale: "", was: "" })
    expect(r.price).toBe(45)
    expect(r.was).toBe(45)
  })

  it("keeps the pasted Price and warns when Sale is given without a usable Was", () => {
    const r = resolveSalePricing({ price: "40", sale: "25", was: "" })
    expect(r.price).toBe(40)
    expect(r.salePct).toBe(25)
    expect(r.recomputed).toBe(false)
    expect(r.correction).toContain("Was")
  })

  it("returns nulls when the row has no usable numbers at all", () => {
    const r = resolveSalePricing({ price: "", sale: "", was: "" })
    expect(r.price).toBeNull()
    expect(r.was).toBeNull()
    expect(r.correction).toBeNull()
  })
})
