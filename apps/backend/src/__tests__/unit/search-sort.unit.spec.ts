import { safeSort } from "../../api/store/search/route"

describe("search safeSort allowlist", () => {
  it("accepts allowlisted attribute + direction", () => {
    expect(safeSort("created_at_ts:asc")).toBe("created_at_ts:asc")
    expect(safeSort("abv:desc")).toBe("abv:desc")
    expect(safeSort("title:asc")).toBe("title:asc")
    expect(safeSort("untappd_score:desc")).toBe("untappd_score:desc")
  })

  it("falls back to default for non-sortable attributes", () => {
    expect(safeSort("price:asc")).toBe("created_at_ts:desc")
    expect(safeSort("id:desc")).toBe("created_at_ts:desc")
  })

  it("falls back for invalid direction or shape", () => {
    expect(safeSort("created_at_ts:sideways")).toBe("created_at_ts:desc")
    expect(safeSort("created_at_ts")).toBe("created_at_ts:desc")
    expect(safeSort("")).toBe("created_at_ts:desc")
    expect(safeSort(undefined)).toBe("created_at_ts:desc")
    expect(safeSort("'; DROP TABLE products; --")).toBe("created_at_ts:desc")
  })
})
