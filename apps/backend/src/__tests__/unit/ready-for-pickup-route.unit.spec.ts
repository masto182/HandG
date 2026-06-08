/**
 * Tests the location metadata fallback chain in the ready-for-pickup route.
 *
 *   locationName:    body.location_name → snapshot.name → "Hops & Glory pickup point"
 *   locationAddress: body.location_address → [addr_line, suburb, postcode].join(", ") → ""
 *   locationHours:   body.location_hours → snapshot.hours_summary → undefined
 */

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn(async () => ({ data: { id: "msg_test" }, error: null })) },
  })),
}))

jest.mock("../../lib/email", () => ({
  sendTemplate: jest.fn(async () => ({ sent: true })),
  refreshEmailConfig: jest.fn(async () => {}),
  getStoreUrl: jest.fn(() => "https://test.example.com"),
}))

import { POST } from "../../api/admin/orders/[id]/ready-for-pickup/route"
import * as emailLib from "../../lib/email"
import { Modules } from "@medusajs/framework/utils"

const sendMock = emailLib.sendTemplate as jest.Mock

const BASE_ORDER = {
  id: "ord_1",
  display_id: 42,
  email: "buyer@test.example.com",
  first_name: "Buyer",
  customer_id: "cust_1",
  metadata: {},
}

function makeReq(orderId: string, body: Record<string, string>, order: any = BASE_ORDER) {
  const orderModule = {
    retrieveOrder: jest.fn(async (id: string) => (id === orderId ? order : null)),
    updateOrders: jest.fn(async () => {}),
  }
  return {
    params: { id: orderId },
    body,
    scope: {
      resolve(key: string) {
        if (key === Modules.ORDER) return orderModule
        throw new Error(`unexpected: ${key}`)
      },
    },
    // expose orderModule for assertions
    _orderModule: orderModule,
  }
}

function makeRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe("ready-for-pickup route", () => {
  beforeEach(() => {
    sendMock.mockClear()
  })

  it("returns 404 when order is not found", async () => {
    const req = makeReq("ord_missing", {}, null)
    const res = makeRes()
    // Make retrieveOrder return null for unknown IDs
    req._orderModule.retrieveOrder.mockResolvedValue(null)
    await POST(req as any, res as any)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it("returns 400 when order has no email", async () => {
    const req = makeReq("ord_1", {}, { ...BASE_ORDER, email: undefined })
    const res = makeRes()
    await POST(req as any, res as any)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it("uses body.location_name when provided", async () => {
    const req = makeReq("ord_1", { location_name: "Collins St Store" })
    const res = makeRes()
    await POST(req as any, res as any)
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ locationName: "Collins St Store" }),
      })
    )
  })

  it("falls back to snapshot.name when no body.location_name", async () => {
    const order = {
      ...BASE_ORDER,
      metadata: { pickup_location: { name: "Snapshot Depot" } },
    }
    const req = makeReq("ord_1", {}, order)
    const res = makeRes()
    await POST(req as any, res as any)
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ locationName: "Snapshot Depot" }),
      })
    )
  })

  it("uses the default location name when neither body nor snapshot has one", async () => {
    const req = makeReq("ord_1", {})
    const res = makeRes()
    await POST(req as any, res as any)
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          locationName: "Hops & Glory pickup point",
        }),
      })
    )
  })

  it("assembles address from snapshot parts filtering empty strings", async () => {
    const order = {
      ...BASE_ORDER,
      metadata: {
        pickup_location: {
          address_line: "123 Test St",
          suburb: "Fitzroy",
          postcode: "3065",
        },
      },
    }
    const req = makeReq("ord_1", {}, order)
    const res = makeRes()
    await POST(req as any, res as any)
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          locationAddress: "123 Test St, Fitzroy, 3065",
        }),
      })
    )
  })

  it("assembles address with only postcode — no trailing comma", async () => {
    const order = {
      ...BASE_ORDER,
      metadata: {
        pickup_location: { postcode: "3000" },
      },
    }
    const req = makeReq("ord_1", {}, order)
    const res = makeRes()
    await POST(req as any, res as any)
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ locationAddress: "3000" }),
      })
    )
  })

  it("uses body.location_address over snapshot", async () => {
    const order = {
      ...BASE_ORDER,
      metadata: { pickup_location: { address_line: "Old St" } },
    }
    const req = makeReq("ord_1", { location_address: "99 New St, Melbourne" }, order)
    const res = makeRes()
    await POST(req as any, res as any)
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ locationAddress: "99 New St, Melbourne" }),
      })
    )
  })

  it("stamps ready_for_pickup_at on the order and returns ok", async () => {
    const req = makeReq("ord_1", {})
    const res = makeRes()
    await POST(req as any, res as any)
    expect(req._orderModule.updateOrders).toHaveBeenCalledWith(
      "ord_1",
      expect.objectContaining({
        metadata: expect.objectContaining({
          ready_for_pickup_at: expect.any(String),
        }),
      })
    )
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))
  })
})
