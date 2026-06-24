import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /admin/orders/:id/payid-extend
 *
 * Body: { extended_until: string }  — ISO 8601 datetime, must be in the future.
 *
 * Sets order.metadata.payid_extended_until so the cancel-unpaid-payid-orders
 * job skips this order until that datetime passes.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const body = (req.body ?? {}) as { extended_until?: string }

  if (!orderId) {
    res.status(400).json({ message: "missing order id" })
    return
  }

  if (!body.extended_until) {
    res.status(400).json({ message: "extended_until is required" })
    return
  }

  const extDate = new Date(body.extended_until)
  if (isNaN(extDate.getTime())) {
    res.status(400).json({ message: "extended_until must be a valid ISO 8601 datetime" })
    return
  }

  if (extDate <= new Date()) {
    res.status(400).json({ message: "extended_until must be in the future" })
    return
  }

  const orderModule = req.scope.resolve(Modules.ORDER)

  let order: any
  try {
    order = await orderModule.retrieveOrder(orderId)
  } catch {
    res.status(404).json({ message: "order not found" })
    return
  }

  const updatedMetadata = {
    ...(order.metadata ?? {}),
    payid_extended_until: extDate.toISOString(),
  }

  await (orderModule as any).updateOrders([{ id: orderId, metadata: updatedMetadata }])

  res.json({
    order: {
      id: orderId,
      metadata: updatedMetadata,
    },
  })
}
