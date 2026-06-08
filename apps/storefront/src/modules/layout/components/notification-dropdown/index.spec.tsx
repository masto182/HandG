import { filterNewAlertNotifications } from "@lib/util/notification-toast"

type N = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
}

const n = (id: string, type: string, read = false): N => ({
  id,
  type,
  title: `${type} title`,
  body: `${type} body`,
  read,
  created_at: new Date().toISOString(),
})

describe("filterNewAlertNotifications", () => {
  it("returns unread alert-type notifications not in seenIds", () => {
    const result = filterNewAlertNotifications(
      [n("1", "new_drop"), n("2", "restock"), n("3", "order_status")],
      new Set(),
    )
    expect(result.map((r) => r.id)).toEqual(["1", "2"])
  })

  it("excludes already-seen ids", () => {
    const result = filterNewAlertNotifications(
      [n("1", "new_drop"), n("2", "restock")],
      new Set(["1"]),
    )
    expect(result.map((r) => r.id)).toEqual(["2"])
  })

  it("excludes read notifications", () => {
    const result = filterNewAlertNotifications(
      [n("1", "new_drop", true), n("2", "restock", false)],
      new Set(),
    )
    expect(result.map((r) => r.id)).toEqual(["2"])
  })

  it("returns empty when all are seen or read", () => {
    const result = filterNewAlertNotifications(
      [n("1", "new_drop", true), n("2", "restock")],
      new Set(["2"]),
    )
    expect(result).toHaveLength(0)
  })

  it("ignores non-alert types regardless of read/seen status", () => {
    const result = filterNewAlertNotifications(
      [n("1", "vip_tier"), n("2", "order_status"), n("3", "wishlist_match")],
      new Set(),
    )
    expect(result).toHaveLength(0)
  })
})
