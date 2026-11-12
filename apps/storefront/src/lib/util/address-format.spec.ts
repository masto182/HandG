import {
  buildAuStreetLine,
  formatUnit,
  isSameUnit,
  normaliseAuAddress,
  splitAuAddressForForm,
  splitLeadingUnit,
} from "@retail-example/shared-types"

describe("buildAuStreetLine", () => {
  it.each([
    ["18", "28 McDonald Street", "18/28 McDonald Street"],
    ["Unit 18", "28 McDonald Street", "Unit 18, 28 McDonald Street"],
    ["unit 18", "28 McDonald Street", "Unit 18, 28 McDonald Street"],
    ["Level 5", "1 Martin Place", "Level 5, 1 Martin Place"],
    ["suite 3 level 5", "1 Martin Place", "Suite 3 Level 5, 1 Martin Place"],
    ["4a", "12 Smith Street", "4A, 12 Smith Street"],
    ["shop 2", "100 Oxford Street", "Shop 2, 100 Oxford Street"],
    ["", "28 McDonald Street", "28 McDonald Street"],
    [null, " 28  McDonald Street ", "28 McDonald Street"],
    ["18", "", "18"],
  ])("unit %p + street %p -> %p", (unit, street, expected) => {
    expect(buildAuStreetLine(unit, street)).toBe(expected)
  })
})

describe("splitLeadingUnit", () => {
  it.each([
    ["18/28 McDonald Street", "18", "28 McDonald Street"],
    ["18/ 28 McDonald Street", "18", "28 McDonald Street"],
    ["unit 18/28 McDonald Street", "Unit 18", "28 McDonald Street"],
    ["Unit 18, 28 McDonald Street", "Unit 18", "28 McDonald Street"],
    ["Level 5 1 Martin Place Sydney", "Level 5", "1 Martin Place Sydney"],
    ["suite 3 level 5/1 Martin Place", "Suite 3 Level 5", "1 Martin Place"],
    ["4a/12 Smith Street", "4A", "12 Smith Street"],
    ["28-30 McDonald Street", null, "28-30 McDonald Street"],
    ["28 McDonald Street", null, "28 McDonald Street"],
  ])("%p -> unit %p, street %p", (input, unit, street) => {
    expect(splitLeadingUnit(input)).toEqual({ unit, street })
  })
})

describe("normaliseAuAddress", () => {
  it("moves a numeric unit into line 1 (Jonathan, this order)", () => {
    expect(normaliseAuAddress("28 McDonald Street", "18")).toEqual({
      address_1: "18/28 McDonald Street",
      address_2: "",
    })
  })

  it("does not double a unit already in line 1 (Jonathan, previous order)", () => {
    expect(normaliseAuAddress("18/ 28 McDonald Street", "18")).toEqual({
      address_1: "18/28 McDonald Street",
      address_2: "",
    })
  })

  it("keeps the words the customer used", () => {
    expect(normaliseAuAddress("28 McDonald Street", "Level 5")).toEqual({
      address_1: "Level 5, 28 McDonald Street",
      address_2: "",
    })
  })

  it("prefers the worded version when both say the same unit", () => {
    expect(normaliseAuAddress("18/28 McDonald Street", "Unit 18")).toEqual({
      address_1: "Unit 18, 28 McDonald Street",
      address_2: "",
    })
  })

  it("keeps a conflicting unit on line 2 rather than guessing", () => {
    expect(normaliseAuAddress("5/28 McDonald Street", "18")).toEqual({
      address_1: "5/28 McDonald Street",
      address_2: "18",
    })
  })

  it("tidies a unit typed straight into line 1", () => {
    expect(normaliseAuAddress("unit 18/28 McDonald Street", "")).toEqual({
      address_1: "Unit 18, 28 McDonald Street",
      address_2: "",
    })
  })

  it("leaves a plain address alone", () => {
    expect(normaliseAuAddress("42 Greenup Street", null)).toEqual({
      address_1: "42 Greenup Street",
      address_2: "",
    })
  })
})

describe("splitAuAddressForForm", () => {
  it.each([
    ["18/28 McDonald Street", "", "18", "28 McDonald Street"],
    ["Level 5, 28 McDonald Street", "", "Level 5", "28 McDonald Street"],
    ["28 McDonald Street", "18", "18", "28 McDonald Street"],
    ["18/ 28 McDonald Street", "18", "18", "28 McDonald Street"],
    ["5/28 McDonald Street", "18", "5, 18", "28 McDonald Street"],
    ["42 Greenup Street", null, "", "42 Greenup Street"],
  ])("%p + %p -> unit %p, street %p", (a1, a2, unit, street) => {
    expect(splitAuAddressForForm(a1, a2)).toEqual({ unit, street })
  })

  it("round-trips through normaliseAuAddress", () => {
    const split = splitAuAddressForForm("Level 5, 28 McDonald Street", "")
    expect(normaliseAuAddress(split.street, split.unit).address_1).toBe(
      "Level 5, 28 McDonald Street",
    )
  })
})

describe("helpers", () => {
  it("formats Google's lowercase units", () => {
    expect(formatUnit("suite 3 level 5")).toBe("Suite 3 Level 5")
    expect(formatUnit("4a")).toBe("4A")
  })

  it("matches 18 and Unit 18 as the same unit", () => {
    expect(isSameUnit("18", "Unit 18")).toBe(true)
    expect(isSameUnit("18", "5")).toBe(false)
    expect(isSameUnit("", "18")).toBe(false)
  })
})
