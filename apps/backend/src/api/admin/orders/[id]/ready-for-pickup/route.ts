import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  sendTemplate,
  refreshEmailConfig,
  getStoreUrl,
} from "../../../../../lib/email"
import * as OrderReadyForPickupTpl from "../../../../../emails/order-ready-for-pickup"

/**
 * POST /admin/orders/:id/ready-for-pickup
 *
 * Marks the order as ready for pickup (writes timestamp + optional location
 * metadata) and sends the customer the pickup-ready email. Idempotent:
 * re-calling will overwrite `ready_for_pickup_at` and re-send the email.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const orderId = req.params.id
  const orderModule = req.scope.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(orderId)
  if (!order) {
    return res.status(404).json({ error: "Order not found" })
  }
  if (!(order as any).email) {
    return res.status(400).json({ error: "Order has no email" })
  }

  const body = (req.body || {}) as {
    location_id?: string
    location_name?: string
    location_address?: string
    location_hours?: string
  }

  // Prefer pickup snapshot from cart metadata if present (Sprint 2 pattern).
  const snapshot = (order as any).metadata?.pickup_location
  const locationName =
    body.location_name || snapshot?.name || "Hops & Glory pickup point"
  const locationAddress =
    body.location_address ||
    [snapshot?.address_line, snapshot?.suburb, snapshot?.postcode]
      .filter(Boolean)
      .join(", ") ||
    ""
  const locationHours = body.location_hours || snapshot?.hours_summary

  await orderModule.updateOrders(orderId, {
    metadata: {
      ...((order as any).metadata || {}),
      ready_for_pickup_at: new Date().toISOString(),
    },
  } as any)

  await refreshEmailConfig(req.scope)
  const result = await sendTemplate({
    to: (order as any).email,
    customerId: (order as any).customer_id,
    category: "orders",
    template: OrderReadyForPickupTpl,
    props: {
      name: (order as any).first_name || "Collector",
      orderDisplayId: String((order as any).display_id ?? order.id),
      locationName,
      locationAddress,
      locationHours,
      storeUrl: getStoreUrl(),
    },
    container: req.scope,
  })

  return res.json({ ok: true, email: result })
}
