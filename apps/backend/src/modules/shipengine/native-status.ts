import { Modules } from "@medusajs/framework/utils"
import {
  createOrderShipmentWorkflow,
  markOrderFulfillmentAsDeliveredWorkflow,
} from "@medusajs/medusa/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"

type TrackingStatus = "in_transit" | "delivered" | "exception" | "unknown"

type FulfillmentForSync = {
  shipped_at?: Date | string | null
  delivered_at?: Date | string | null
  canceled_at?: Date | string | null
  items?: Array<{ line_item_id?: string | null; quantity?: number | string | null }>
  labels?: Array<{
    tracking_number?: string | null
    tracking_url?: string | null
    label_url?: string | null
  }>
}

export type NativeSyncResult = { shipped: boolean; delivered: boolean }

export async function syncNativeFulfillmentStatus(
  container: MedusaContainer,
  input: { orderId: string; fulfillmentId: string; status: TrackingStatus }
): Promise<NativeSyncResult> {
  const result: NativeSyncResult = { shipped: false, delivered: false }
  if (input.status !== "in_transit" && input.status !== "delivered") return result

  const fulfillmentModule = container.resolve(Modules.FULFILLMENT) as {
    retrieveFulfillment: (
      id: string,
      config?: { relations?: string[] }
    ) => Promise<FulfillmentForSync>
  }
  const f = await fulfillmentModule.retrieveFulfillment(input.fulfillmentId, {
    relations: ["items", "labels"],
  })
  if (f.canceled_at) return result

  if (!f.shipped_at) {
    const items = new Map<string, number>()
    for (const it of f.items ?? []) {
      if (!it.line_item_id) continue
      items.set(it.line_item_id, (items.get(it.line_item_id) ?? 0) + Number(it.quantity ?? 0))
    }
    await createOrderShipmentWorkflow(container).run({
      input: {
        order_id: input.orderId,
        fulfillment_id: input.fulfillmentId,
        items: [...items].map(([id, quantity]) => ({ id, quantity })),
        labels: (f.labels ?? []).map((l) => ({
          tracking_number: l.tracking_number ?? "",
          tracking_url: l.tracking_url ?? "",
          label_url: l.label_url ?? "",
        })),
        no_notification: input.status === "delivered",
      },
    })
    result.shipped = true
  }

  if (input.status === "delivered" && !f.delivered_at) {
    await markOrderFulfillmentAsDeliveredWorkflow(container).run({
      input: { orderId: input.orderId, fulfillmentId: input.fulfillmentId },
    })
    result.delivered = true
  }

  return result
}
