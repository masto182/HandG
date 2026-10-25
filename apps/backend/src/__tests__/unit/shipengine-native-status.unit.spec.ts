const shipmentRun = jest.fn().mockResolvedValue({})
const deliveredRun = jest.fn().mockResolvedValue({})

jest.mock("@medusajs/medusa/core-flows", () => ({
  createOrderShipmentWorkflow: () => ({ run: shipmentRun }),
  markOrderFulfillmentAsDeliveredWorkflow: () => ({ run: deliveredRun }),
}))

import { Modules } from "@medusajs/framework/utils"
import { syncNativeFulfillmentStatus } from "../../modules/shipengine/native-status"

function container(fulfillment: Record<string, unknown>) {
  return {
    resolve(key: string) {
      if (key === Modules.FULFILLMENT)
        return { retrieveFulfillment: jest.fn().mockResolvedValue(fulfillment) }
      throw new Error(`unexpected ${key}`)
    },
  } as any
}

const base = {
  items: [
    { line_item_id: "li_1", quantity: 1 },
    { line_item_id: "li_1", quantity: 1 },
    { line_item_id: "li_2", quantity: 3 },
  ],
  labels: [{ tracking_number: "MP1", tracking_url: "", label_url: "https://l/1.pdf" }],
}

describe("syncNativeFulfillmentStatus", () => {
  beforeEach(() => {
    shipmentRun.mockClear()
    deliveredRun.mockClear()
  })

  it("marks shipped on first in-transit scan, keeping labels and sending the shipped email", async () => {
    const res = await syncNativeFulfillmentStatus(container(base), {
      orderId: "o1",
      fulfillmentId: "f1",
      status: "in_transit",
    })
    expect(res).toEqual({ shipped: true, delivered: false })
    expect(shipmentRun).toHaveBeenCalledWith({
      input: {
        order_id: "o1",
        fulfillment_id: "f1",
        items: [
          { id: "li_1", quantity: 2 },
          { id: "li_2", quantity: 3 },
        ],
        labels: [{ tracking_number: "MP1", tracking_url: "", label_url: "https://l/1.pdf" }],
        no_notification: false,
      },
    })
    expect(deliveredRun).not.toHaveBeenCalled()
  })

  it("does nothing for in-transit when already shipped", async () => {
    const res = await syncNativeFulfillmentStatus(container({ ...base, shipped_at: new Date() }), {
      orderId: "o1",
      fulfillmentId: "f1",
      status: "in_transit",
    })
    expect(res).toEqual({ shipped: false, delivered: false })
    expect(shipmentRun).not.toHaveBeenCalled()
  })

  it("on delivered without a prior shipment, ships silently then marks delivered", async () => {
    const res = await syncNativeFulfillmentStatus(container(base), {
      orderId: "o1",
      fulfillmentId: "f1",
      status: "delivered",
    })
    expect(res).toEqual({ shipped: true, delivered: true })
    expect(shipmentRun.mock.calls[0][0].input.no_notification).toBe(true)
    expect(deliveredRun).toHaveBeenCalledWith({ input: { orderId: "o1", fulfillmentId: "f1" } })
  })

  it("skips already-delivered, cancelled, exception and unknown", async () => {
    await syncNativeFulfillmentStatus(
      container({ ...base, shipped_at: new Date(), delivered_at: new Date() }),
      {
        orderId: "o1",
        fulfillmentId: "f1",
        status: "delivered",
      }
    )
    await syncNativeFulfillmentStatus(container({ ...base, canceled_at: new Date() }), {
      orderId: "o1",
      fulfillmentId: "f1",
      status: "delivered",
    })
    await syncNativeFulfillmentStatus(container(base), {
      orderId: "o1",
      fulfillmentId: "f1",
      status: "exception",
    })
    await syncNativeFulfillmentStatus(container(base), {
      orderId: "o1",
      fulfillmentId: "f1",
      status: "unknown",
    })
    expect(shipmentRun).not.toHaveBeenCalled()
    expect(deliveredRun).not.toHaveBeenCalled()
  })
})
