import {
  mapShipEngineStatus,
  normalizeShipEngineWebhook,
  verifyShipEngineWebhook,
} from "../../modules/shipengine/webhook"

describe("verifyShipEngineWebhook", () => {
  it("rejects when no expected secret is configured", () => {
    expect(verifyShipEngineWebhook({ headerSecret: "x", querySecret: undefined, expectedSecret: undefined }))
      .toEqual({ ok: false, reason: "webhook_secret_not_configured" })
  })

  it("rejects when neither header nor query carries a candidate secret", () => {
    expect(verifyShipEngineWebhook({ headerSecret: undefined, querySecret: undefined, expectedSecret: "abc" }))
      .toEqual({ ok: false, reason: "no_secret_provided" })
  })

  it("rejects mismatched length without timing leak", () => {
    expect(verifyShipEngineWebhook({ headerSecret: "abcd", querySecret: undefined, expectedSecret: "abc" }))
      .toEqual({ ok: false, reason: "secret_length_mismatch" })
  })

  it("rejects same-length but different secrets", () => {
    expect(verifyShipEngineWebhook({ headerSecret: "abcd", querySecret: undefined, expectedSecret: "abce" }))
      .toEqual({ ok: false, reason: "secret_mismatch" })
  })

  it("accepts header secret match", () => {
    expect(verifyShipEngineWebhook({ headerSecret: "shh", querySecret: undefined, expectedSecret: "shh" }))
      .toEqual({ ok: true })
  })

  it("accepts query secret match when header is absent", () => {
    expect(verifyShipEngineWebhook({ headerSecret: undefined, querySecret: "shh", expectedSecret: "shh" }))
      .toEqual({ ok: true })
  })

  it("uses first array entry when secret arrives as array", () => {
    expect(verifyShipEngineWebhook({
      headerSecret: ["shh", "ignored"], querySecret: undefined, expectedSecret: "shh",
    })).toEqual({ ok: true })
  })
})

describe("mapShipEngineStatus", () => {
  it.each([
    ["DE", "delivered"],
    ["de", "delivered"],
    ["EX", "exception"],
    ["AC", "in_transit"],
    ["IT", "in_transit"],
    ["AT", "in_transit"],
    ["UN", "unknown"],
    ["NY", "unknown"],
    [undefined, "unknown"],
    [null, "unknown"],
    ["", "unknown"],
  ])("maps %p -> %p", (code, expected) => {
    expect(mapShipEngineStatus(code as string | null | undefined)).toBe(expected)
  })
})

describe("normalizeShipEngineWebhook", () => {
  it("populates delivered_at only when delivered", () => {
    const out = normalizeShipEngineWebhook({
      data: {
        tracking_number: "ABC123",
        status_code: "DE",
        status_description: "Delivered",
        actual_delivery_date: "2026-05-18T03:00:00Z",
        events: [{ description: "OOD" }, { description: "Delivered" }],
      },
    })
    expect(out.tracking_number).toBe("ABC123")
    expect(out.status).toBe("delivered")
    expect(out.delivered_at).toBe("2026-05-18T03:00:00Z")
    expect(out.events).toHaveLength(2)
  })

  it("leaves delivered_at null on in_transit", () => {
    const out = normalizeShipEngineWebhook({
      data: { tracking_number: "X", status_code: "IT", actual_delivery_date: "2026-05-18T03:00:00Z" },
    })
    expect(out.status).toBe("in_transit")
    expect(out.delivered_at).toBeNull()
  })

  it("falls back to carrier_status_description when status_description missing", () => {
    const out = normalizeShipEngineWebhook({
      data: { tracking_number: "X", status_code: "EX", carrier_status_description: "Damaged" },
    })
    expect(out.status_description).toBe("Damaged")
    expect(out.status).toBe("exception")
  })

  it("treats missing data block as unknown", () => {
    const out = normalizeShipEngineWebhook({})
    expect(out.tracking_number).toBeNull()
    expect(out.status).toBe("unknown")
    expect(out.events).toEqual([])
  })
})
