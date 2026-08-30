import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  schedulePickupForFulfillments,
  PickupIneligibleError,
  type PickupEligibleFulfillment,
} from "../../../modules/shipengine"

/**
 * GET /admin/pickups
 *
 * Lists ShipEngine fulfillments eligible for pickup scheduling (labelled,
 * not yet cancelled, no metadata.pickup) alongside fulfillments that already
 * have a scheduled pickup.
 *
 * POST /admin/pickups
 *
 * body: { fulfillment_ids: string[], pickup_window?: { start_at, end_at } }
 * Schedules one pickup covering all given fulfillments (must share a
 * carrier). Persists the result to each fulfillment's metadata.pickup.
 *
 * workflow-exempt: admin-triggered external carrier call + metadata write,
 * same pattern as the shipengine webhook route and refresh-carriers route.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: {
      entity: string
      fields: string[]
      filters?: Record<string, unknown>
    }) => Promise<{ data: Array<Record<string, unknown>> }>
  }

  try {
    const result = await query.graph({
      entity: "fulfillment",
      fields: [
        "id",
        "data",
        "metadata",
        "provider_id",
        "shipped_at",
        "canceled_at",
        "delivered_at",
      ],
      filters: { provider_id: "shipengine_shipengine" },
    })

    const fulfillments = (result.data ?? []) as Array<{
      id: string
      data?: Record<string, unknown> | null
      metadata?: Record<string, unknown> | null
      canceled_at?: string | null
    }>

    const eligible = fulfillments.filter(
      (f) => !f.canceled_at && f.data?.label_id && !f.metadata?.pickup
    )
    const scheduled = fulfillments.filter((f) => f.metadata?.pickup)

    res.json({
      eligible: eligible.map((f) => ({
        id: f.id,
        carrier_id: f.data?.carrier_id ?? null,
        carrier_code: f.data?.carrier_code ?? null,
        tracking_number: f.data?.tracking_number ?? null,
      })),
      scheduled: scheduled.map((f) => ({
        id: f.id,
        pickup: f.metadata?.pickup,
      })),
    })
  } catch (err) {
    logger.error(`[pickups] GET failed: ${(err as Error).message}`)
    res.status(502).json({ message: (err as Error).message, code: "pickups_list_error" })
  }
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const body = (req.body ?? {}) as {
    fulfillment_ids?: string[]
    pickup_window?: { start_at: string; end_at: string }
  }

  const fulfillmentIds = Array.isArray(body.fulfillment_ids) ? body.fulfillment_ids : []
  if (!fulfillmentIds.length) {
    res.status(400).json({ message: "fulfillment_ids is required and must be non-empty" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: {
      entity: string
      fields: string[]
      filters?: Record<string, unknown>
    }) => Promise<{
      data: Array<Record<string, unknown>>
    }>
  }

  try {
    const result = await query.graph({
      entity: "fulfillment",
      fields: ["id", "data", "metadata"],
      filters: { id: fulfillmentIds },
    })
    const fulfillments = (result.data ?? []) as PickupEligibleFulfillment[]

    const pickup = await schedulePickupForFulfillments(fulfillments, body.pickup_window)

    const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT) as {
      retrieveFulfillment: (id: string) => Promise<{ metadata?: Record<string, unknown> }>
      updateFulfillment: (
        id: string,
        data: { metadata: Record<string, unknown> }
      ) => Promise<unknown>
    }

    for (const fulfillment of fulfillments) {
      const existing = await fulfillmentModule.retrieveFulfillment(fulfillment.id)
      await fulfillmentModule.updateFulfillment(fulfillment.id, {
        metadata: {
          ...(existing.metadata ?? {}),
          pickup: {
            pickup_id: pickup.pickup_id,
            status: pickup.status,
            pickup_window: pickup.pickup_window,
            confirmation_numbers: pickup.confirmation_numbers ?? [],
            scheduled_at: new Date().toISOString(),
          },
        },
      }) // workflow-exempt: admin-triggered external carrier call + metadata write
    }

    res.json({ ok: true, pickup })
  } catch (err) {
    if (err instanceof PickupIneligibleError) {
      res.status(400).json({ message: err.message, code: "pickup_ineligible" })
      return
    }
    logger.error(`[pickups] POST failed: ${(err as Error).message}`)
    res.status(502).json({ message: (err as Error).message, code: "pickup_schedule_error" })
  }
}
