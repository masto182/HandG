import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { createOrderFulfillmentWorkflow } from "@medusajs/medusa/core-flows"
import { SHIPENGINE_HEAT_HOLD_BLOCKED_CODE } from "../../../../../modules/shipengine/service"

/**
 * POST /admin/orders/:id/ready-to-ship
 *
 * Body: { override?: boolean }
 *
 * Triggers Medusa's createOrderFulfillmentWorkflow for every unfulfilled item
 * on the order. If `override: true`, sets order.metadata.heat_hold_override
 * before running so the ShipEngine provider's heat-hold gate lets it through.
 *
 * Surfaces 409 with code HEAT_HOLD_BLOCKED when blocked.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const body = (req.body ?? {}) as { override?: boolean }
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  if (!orderId) {
    res.status(400).json({ message: "missing order id" })
    return
  }

  const orderModule = req.scope.resolve(Modules.ORDER)
  let order
  try {
    order = await orderModule.retrieveOrder(orderId, { relations: ["items"] })
  } catch {
    res.status(404).json({ message: `order ${orderId} not found` })
    return
  }

  if (body.override) {
    await orderModule.updateOrders(orderId, {
      metadata: { ...(order.metadata ?? {}), heat_hold_override: true },
    })
    logger.info(`[shipengine] heat_hold_override set on ${orderId} by admin request`)
  }

  const items = (order.items ?? []).map((it) => ({
    id: it.id,
    quantity: typeof it.quantity === "number" ? it.quantity : Number(it.quantity ?? 1),
  })).filter((it) => it.quantity > 0)

  if (!items.length) {
    res.status(400).json({ message: "order has no items to fulfill" })
    return
  }

  try {
    const { result } = await createOrderFulfillmentWorkflow(req.scope).run({
      input: {
        order_id: orderId,
        items,
      },
    })
    res.json({ fulfillment: result })
  } catch (err) {
    const message = (err as Error).message ?? "fulfillment failed"
    const code = (err as MedusaError).code
    if (code === SHIPENGINE_HEAT_HOLD_BLOCKED_CODE || message.includes(SHIPENGINE_HEAT_HOLD_BLOCKED_CODE)) {
      res.status(409).json({
        code: SHIPENGINE_HEAT_HOLD_BLOCKED_CODE,
        message: "Heat hold is active. Pass `{override: true}` or toggle heat_hold_enabled off.",
        override_url: `/admin/orders/${orderId}?heatOverride=true`,
      })
      return
    }
    logger.error(`[shipengine] ready-to-ship failed for ${orderId}: ${message}`)
    res.status(500).json({ message })
  }
}
