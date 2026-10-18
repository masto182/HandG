import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { POST } from "../../api/webhooks/shipengine/route"

function makeRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

function makeReq(body: unknown, fulfillments: Array<Record<string, unknown>>) {
  const logger = { warn: jest.fn(), error: jest.fn() }
  const graph = jest.fn().mockResolvedValue({ data: fulfillments })
  const fulfillmentModule = {
    retrieveFulfillment: jest.fn().mockResolvedValue({ metadata: {} }),
    updateFulfillment: jest.fn().mockResolvedValue({}),
  }
  const eventBus = { emit: jest.fn().mockResolvedValue(undefined) }
  return {
    headers: { "x-shipengine-secret": "test-secret" },
    query: {},
    body,
    scope: {
      resolve(key: string) {
        if (key === ContainerRegistrationKeys.LOGGER) return logger
        if (key === ContainerRegistrationKeys.QUERY) return { graph }
        if (key === Modules.FULFILLMENT) return fulfillmentModule
        if (key === Modules.EVENT_BUS) return eventBus
        throw new Error(`unexpected dependency: ${key}`)
      },
    },
    _graph: graph,
    _fulfillmentModule: fulfillmentModule,
    _eventBus: eventBus,
  }
}

const delivered = {
  resource_type: "API_TRACK",
  data: {
    tracking_number: "TRK1",
    status_code: "DE",
    actual_delivery_date: "2026-10-18T01:00:00Z",
  },
}

describe("shipengine webhook route", () => {
  const originalSecret = process.env.SHIPENGINE_WEBHOOK_SECRET

  beforeEach(() => {
    process.env.SHIPENGINE_WEBHOOK_SECRET = "test-secret"
  })

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.SHIPENGINE_WEBHOOK_SECRET
    else process.env.SHIPENGINE_WEBHOOK_SECRET = originalSecret
  })

  it("queries fulfillments by the registered provider id", async () => {
    const req = makeReq(delivered, [])
    await POST(req as any, makeRes())
    expect(req._graph).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { provider_id: "shipengine_shipengine" } })
    )
  })

  it("persists the tracking event and emits order.delivered for a matched fulfillment", async () => {
    const req = makeReq(delivered, [
      { id: "ful_1", data: { tracking_number: "TRK1" }, shipment: { order_id: "order_1" } },
    ])
    const res = makeRes()
    await POST(req as any, res)

    expect(req._fulfillmentModule.updateFulfillment).toHaveBeenCalledWith(
      "ful_1",
      expect.objectContaining({
        metadata: expect.objectContaining({
          last_tracking_status: "delivered",
          delivered_at: "2026-10-18T01:00:00Z",
        }),
      })
    )
    expect(req._eventBus.emit).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "order.delivered",
        data: expect.objectContaining({ id: "order_1" }),
      }),
    ])
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("returns 500 so ShipEngine retries when persisting fails", async () => {
    const req = makeReq(delivered, [
      { id: "ful_1", data: { tracking_number: "TRK1" }, shipment: { order_id: "order_1" } },
    ])
    req._fulfillmentModule.updateFulfillment.mockRejectedValueOnce(new Error("db down"))
    const res = makeRes()
    await POST(req as any, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(req._eventBus.emit).not.toHaveBeenCalled()
  })

  it("does not emit order.delivered again for a repeated delivered event", async () => {
    const req = makeReq(delivered, [
      { id: "ful_1", data: { tracking_number: "TRK1" }, shipment: { order_id: "order_1" } },
    ])
    req._fulfillmentModule.retrieveFulfillment.mockResolvedValueOnce({
      metadata: { last_tracking_status: "delivered" },
    })
    const res = makeRes()
    await POST(req as any, res)
    expect(req._eventBus.emit).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("rejects a request with the wrong secret", async () => {
    const req = makeReq(delivered, [])
    req.headers = { "x-shipengine-secret": "wrong-secret" }
    const res = makeRes()
    await POST(req as any, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(req._graph).not.toHaveBeenCalled()
  })
})
