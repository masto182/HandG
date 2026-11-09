import { parseMemberSort, sortByKey, tierRank } from "../../api/admin/members/sort"

describe("members sort", () => {
  it("parses direction and rejects unknown fields", () => {
    expect(parseMemberSort("-vip_score")).toEqual({ field: "vip_score", desc: true })
    expect(parseMemberSort("name")).toEqual({ field: "name", desc: false })
    expect(parseMemberSort("password")).toBeNull()
    expect(parseMemberSort(undefined)).toBeNull()
  })

  it("ranks tiers suspended < pending < approved < vip1 < vip5", () => {
    const ranks = [["suspended"], [], ["approved"], ["vip1"], ["vip5"]].map(tierRank)
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks)
  })

  it("sorts numbers descending and keeps nulls last in both directions", () => {
    const rows = [
      { id: "a", v: 5 },
      { id: "b", v: null },
      { id: "c", v: 20 },
      { id: "d", v: 1 },
    ]
    const desc = sortByKey(
      rows,
      (r) => r.v,
      true,
      (r) => r.id
    ).map((r) => r.id)
    const asc = sortByKey(
      rows,
      (r) => r.v,
      false,
      (r) => r.id
    ).map((r) => r.id)
    expect(desc).toEqual(["c", "a", "d", "b"])
    expect(asc).toEqual(["d", "a", "c", "b"])
  })

  it("sorts strings case-insensitively with a stable id tie-break", () => {
    const rows = [
      { id: "2", n: "bob" },
      { id: "1", n: "Bob" },
      { id: "3", n: "alice" },
    ]
    expect(
      sortByKey(
        rows,
        (r) => r.n,
        false,
        (r) => r.id
      ).map((r) => r.id)
    ).toEqual(["3", "1", "2"])
  })
})
