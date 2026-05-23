import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * POST /admin/orders/:id/auspost/tracking
 *
 * Body: {
 *   fulfillment_id: string,
 *   tracking_numbers: string[],   // one per parcel
 *   carrier_url?: string,         // optional override (default Australia Post tracking)
 * }
 *
 * Records the tracking numbers the operator pasted from MyPost Business after
 * lodging the parcels manually. Sets the fulfillment's shipped_at and emits
 * the order.shipment_created event so the order-shipped-email subscriber fires.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const body = (req.body ?? {}) as {
    fulfillment_id?: string
    tracking_numbers?: string[]
    carrier_url?: string
  }
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const eventBus = req.scope.resolve(Modules.EVENT_BUS) as {
    emit(events: { name: string; data: Record<string, unknown> }[]): Promise<void>
  }

  if (!orderId) {
    res.status(400).json({ message: "missing order id" })
    return
  }
  if (!body.fulfillment_id) {
    res.status(400).json({ message: "fulfillment_id is required" })
    return
  }
  const tracking = (body.tracking_numbers ?? []).map((s) => String(s ?? "").trim()).filter(Boolean)
  if (!tracking.length) {
    res.status(400).json({ message: "tracking_numbers must be a non-empty array" })
    return
  }

  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT) as {
    retrieveFulfillment(id: string): Promise<any>
    updateFulfillment(id: string, update: Record<string, unknown>): Promise<any>
  }

  let fulfillment: any
  try {
    fulfillment = await fulfillmentModule.retrieveFulfillment(body.fulfillment_id)
  } catch {
    res.status(404).json({ message: `fulfillment ${body.fulfillment_id} not found` })
    return
  }

  const existingData = (fulfillment?.data ?? {}) as Record<string, unknown>
  if (!existingData.manual_lodgement) {
    res.status(400).json({
      message: "fulfillment is not a manual_lodgement (auspost) fulfillment",
    })
    return
  }

  const trackingUrl = (n: string) =>
    body.carrier_url
      ? `${body.carrier_url}${encodeURIComponent(n)}`
      : `https://auspost.com.au/mypost/track/details/${encodeURIComponent(n)}`

  const labels = tracking.map((n) => ({
    tracking_number: n,
    tracking_url: trackingUrl(n),
    label_url: "",
  }))

  await fulfillmentModule.updateFulfillment(body.fulfillment_id, {
    data: {
      ...existingData,
      tracking_numbers: tracking,
      lodged_at: new Date().toISOString(),
    },
    labels,
    shipped_at: new Date(),
  })

  // Emit shipment_created so the order-shipped-email subscriber notifies the customer.
  try {
    await eventBus.emit([
      {
        name: "order.shipment_created",
        data: {
          order_id: orderId,
          fulfillment_id: body.fulfillment_id,
          tracking_numbers: tracking,
        },
      },
    ])
  } catch (err) {
    logger.warn(`[auspost] tracking saved but shipment_created emit failed: ${(err as Error).message}`)
  }

  res.json({
    ok: true,
    fulfillment_id: body.fulfillment_id,
    tracking_numbers: tracking,
    labels,
  })
}
