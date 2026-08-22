import { isQuietHours, exceedsThrottle, getHourInTz } from "../../lib/alert-throttle"
import { mergeRecipients } from "../../lib/resolve-new-drop-recipients"

describe("alert-throttle quiet hours", () => {
  it("returns false when disabled", () => {
    expect(isQuietHours(new Date(), { enabled: false, fromHour: 22, toHour: 8, tz: "UTC" })).toBe(
      false
    )
  })

  it("handles overnight window (22 -> 8)", () => {
    const cfg = { enabled: true, fromHour: 22, toHour: 8, tz: "UTC" }
    expect(isQuietHours(new Date("2026-06-01T23:00:00Z"), cfg)).toBe(true)
    expect(isQuietHours(new Date("2026-06-01T03:00:00Z"), cfg)).toBe(true)
    expect(isQuietHours(new Date("2026-06-01T12:00:00Z"), cfg)).toBe(false)
    expect(isQuietHours(new Date("2026-06-01T08:00:00Z"), cfg)).toBe(false)
  })

  it("handles same-day window (1 -> 6)", () => {
    const cfg = { enabled: true, fromHour: 1, toHour: 6, tz: "UTC" }
    expect(isQuietHours(new Date("2026-06-01T02:00:00Z"), cfg)).toBe(true)
    expect(isQuietHours(new Date("2026-06-01T07:00:00Z"), cfg)).toBe(false)
  })

  it("from === to is never quiet", () => {
    expect(isQuietHours(new Date(), { enabled: true, fromHour: 9, toHour: 9, tz: "UTC" })).toBe(
      false
    )
  })

  it("evaluates the hour in the configured timezone", () => {
    const d = new Date("2026-06-01T12:00:00Z")
    expect(getHourInTz(d, "UTC")).toBe(12)
    expect(getHourInTz(d, "Australia/Sydney")).toBe(22)
  })
})

describe("exceedsThrottle", () => {
  it("blocks once at/over the cap, allows under", () => {
    expect(exceedsThrottle(3, 3)).toBe(true)
    expect(exceedsThrottle(2, 3)).toBe(false)
    expect(exceedsThrottle(0, 3)).toBe(false)
  })
  it("cap of 0 means unlimited", () => {
    expect(exceedsThrottle(100, 0)).toBe(false)
  })
})

describe("mergeRecipients", () => {
  const ch = (customer_id: string, channel_email = true, channel_inapp = true, name?: string) => ({
    customer_id,
    channel_email,
    channel_inapp,
    name,
  })

  it("dedupes a customer matched by both brewery and hop into one recipient, kind=brewery (placement priority flipped for the narrative follow-up)", () => {
    const out = mergeRecipients({
      breweryFollows: [ch("c1", true, false, "Tree House")],
      hopAlerts: [ch("c1", false, true, "Citra")],
      allNew: [],
      alreadyDispatched: new Set(),
    })
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe("brewery")
    expect(out[0].want_email).toBe(true)
    expect(out[0].want_inapp).toBe(true)
  })

  it("preserves the hop match name even when brewery wins placement", () => {
    const out = mergeRecipients({
      breweryFollows: [ch("c1", true, true, "Tree House")],
      hopAlerts: [ch("c1", true, true, "Citra")],
      allNew: [],
      alreadyDispatched: new Set(),
    })
    expect(out[0].kind).toBe("brewery")
    expect(out[0].breweryNames).toEqual(["Tree House"])
    expect(out[0].hopNames).toEqual(["Citra"])
  })

  it("collects multiple matched brewery/hop names without duplicates", () => {
    const out = mergeRecipients({
      breweryFollows: [ch("c1", true, true, "Tree House"), ch("c1", true, true, "Tree House")],
      hopAlerts: [ch("c1", true, true, "Citra"), ch("c1", true, true, "Peacherine")],
      allNew: [],
      alreadyDispatched: new Set(),
    })
    expect(out[0].breweryNames).toEqual(["Tree House"])
    expect(out[0].hopNames).toEqual(["Citra", "Peacherine"])
  })

  it("respects per-row channel flags for a single-source match", () => {
    const out = mergeRecipients({
      breweryFollows: [ch("c2", false, true, "Fidens")],
      hopAlerts: [],
      allNew: [],
      alreadyDispatched: new Set(),
    })
    expect(out[0]).toMatchObject({ kind: "brewery", want_email: false, want_inapp: true })
  })

  it("hop-only match (no brewery) keeps kind=hop", () => {
    const out = mergeRecipients({
      breweryFollows: [],
      hopAlerts: [ch("c5", true, true, "Citra")],
      allNew: [],
      alreadyDispatched: new Set(),
    })
    expect(out[0]).toMatchObject({ kind: "hop", hopNames: ["Citra"], breweryNames: [] })
  })

  it("all_new forces both channels on", () => {
    const out = mergeRecipients({
      breweryFollows: [],
      hopAlerts: [],
      allNew: [{ customer_id: "c3" }],
      alreadyDispatched: new Set(),
    })
    expect(out[0]).toMatchObject({ kind: "all_new", want_email: true, want_inapp: true })
  })

  it("skips customers already dispatched for this product", () => {
    const out = mergeRecipients({
      breweryFollows: [ch("c1")],
      hopAlerts: [ch("c4")],
      allNew: [{ customer_id: "c1" }],
      alreadyDispatched: new Set(["c1"]),
    })
    expect(out.map((r) => r.customer_id)).toEqual(["c4"])
  })
})
