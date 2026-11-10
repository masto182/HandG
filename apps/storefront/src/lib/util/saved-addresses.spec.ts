import {
  courierNoteOf,
  formatAddressSummary,
  isSameAddress,
  sortSavedAddresses,
  withCourierNote,
} from "./saved-addresses"

const base = {
  first_name: "JT",
  last_name: "Talbot",
  address_1: "42 Greenup Street",
  city: "Redcliffe",
  province: "QLD",
  postal_code: "4020",
  country_code: "au",
}

describe("isSameAddress", () => {
  it("treats a different unit as a different address", () => {
    expect(
      isSameAddress(
        { ...base, address_2: "" },
        { ...base, address_2: "Unit 4" },
      ),
    ).toBe(false)
  })

  it("ignores case and whitespace", () => {
    expect(
      isSameAddress(
        { ...base, address_2: "Unit 4" },
        {
          ...base,
          address_1: " 42  greenup street ",
          address_2: "unit 4",
          phone: "x",
        },
      ),
    ).toBe(true)
  })

  it("treats null and empty as equal", () => {
    expect(
      isSameAddress({ ...base, address_2: null }, { ...base, address_2: "" }),
    ).toBe(true)
  })

  it("treats 4/42 Street and 42 Street + unit 4 as the same address", () => {
    expect(
      isSameAddress(
        { ...base, address_1: "4/42 Greenup Street", address_2: "" },
        { ...base, address_2: "Unit 4" },
      ),
    ).toBe(true)
  })
})

describe("sortSavedAddresses", () => {
  it("puts the default first, then the most recently updated", () => {
    const old = { id: "old", ...base, updated_at: "2026-10-13T12:23:00Z" }
    const newer = {
      id: "newer",
      ...base,
      address_2: "Unit 4",
      updated_at: "2026-10-14T13:31:00Z",
    }
    const def = {
      id: "def",
      ...base,
      is_default_shipping: true,
      updated_at: "2026-01-01T00:00:00Z",
    }
    expect(sortSavedAddresses([old, newer]).map((a) => a.id)).toEqual([
      "newer",
      "old",
    ])
    expect(sortSavedAddresses([old, newer, def]).map((a) => a.id)).toEqual([
      "def",
      "newer",
      "old",
    ])
  })

  it("does not mutate the input", () => {
    const list = [
      { id: "a", updated_at: "2026-01-01" },
      { id: "b", updated_at: "2026-02-01" },
    ]
    sortSavedAddresses(list)
    expect(list.map((a) => a.id)).toEqual(["a", "b"])
  })
})

describe("formatAddressSummary", () => {
  it("shows the unit", () => {
    expect(formatAddressSummary({ ...base, address_2: "Unit 4" })).toBe(
      "Unit 4, 42 Greenup Street, Redcliffe, QLD, 4020",
    )
  })

  it("omits a blank unit", () => {
    expect(formatAddressSummary({ ...base, address_2: " " })).toBe(
      "42 Greenup Street, Redcliffe, QLD, 4020",
    )
  })
})

describe("courier note", () => {
  it("reads and normalises the note from metadata", () => {
    expect(
      courierNoteOf({ metadata: { courier_note: "  side\n gate " } }),
    ).toBe("side gate")
    expect(courierNoteOf({ metadata: null })).toBe("")
    expect(
      courierNoteOf({ metadata: { courier_note: "x".repeat(90) } }),
    ).toHaveLength(60)
  })

  it("keeps other metadata when setting or clearing the note", () => {
    expect(withCourierNote({ label: "Home" }, "Side gate")).toEqual({
      label: "Home",
      courier_note: "Side gate",
    })
    expect(
      withCourierNote({ label: "Home", courier_note: "old" }, "  "),
    ).toEqual({ label: "Home", courier_note: "" })
  })
})
