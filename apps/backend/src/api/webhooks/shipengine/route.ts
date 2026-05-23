import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  normalizeShipEngineWebhook,
  verifyShipEngineWebhook,
  type ShipEngineWebhookPayload,
} from "../../../modules/shipengine/webhook"

/**
 * POST /webhooks/shipengine
 *
 * Receives tracking-status updates from ShipEngine for shipments we labelled.
 * Authenticated via shared secret in `x-shipengine-secret` header (preferred)
 * or `?secret=` query param. Configure SHIPENGINE_WEBHOOK_SECRET in env.
 *
 * On a delivered status, fires `order.delivered` so the Sprint 4 template
 * sends. On an exception, fires `order.shipment_exception`. All updates are
 * persisted to fulfillment.metadata.tracking_events[] for audit + admin UI.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const verification = verifyShipEngineWebhook({
    headerSecret: req.headers["x-shipengine-secret"],
    querySecret: (req.query as Record<string, string | string[] | undefined>)?.secret,
    expectedSecret: process.env.SHIPENGINE_WEBHOOK_SECRET,
  })
  if (!verification.ok) {
    logger.warn(`[shipengine-webhook] rejected: ${verification.reason}`)
    res.status(401).json({ message: "unauthorized" })
    return
  }

  const update = normalizeShipEngineWebhook((req.body ?? {}) as ShipEngineWebhookPayload)
  if (!update.tracking_number) {
    logger.warn("[shipengine-webhook] payload missing tracking_number")
    res.status(202).json({ message: "ignored: missing tracking_number" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: {
      entity: string
      fields: string[]
      filters?: Record<string, unknown>
      pagination?: { take?: number }
    }) => Promise<{ data: Array<Record<string, unknown>> }>
  }

  // Find the fulfillment whose labels reference this tracking number.
  // Stored in fulfillment.labels (Medusa native) or fulfillment.metadata.
  let fulfillmentId: string | null = null
  let orderId: string | null = null
  try {
    const result = await query.graph({
      entity: "fulfillment",
      fields: ["id", "metadata", "labels.tracking_number", "shipment.order_id"],
      filters: { labels: { tracking_number: update.tracking_number } },
      pagination: { take: 1 },
    })
    const row = result.data?.[0] as
      | { id?: string; metadata?: Record<string, unknown>; shipment?: { order_id?: string } }
      | undefined
    if (row?.id) {
      fulfillmentId = row.id
      orderId = row.shipment?.order_id ?? null
    }
  } catch (err) {
    logger.warn(`[shipengine-webhook] fulfillment lookup failed: ${(err as Error).message}`)
  }

  // Append the event to fulfillment.metadata.tracking_events[].
  if (fulfillmentId) {
    try {
      const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT) as {
        retrieveFulfillment: (id: string) => Promise<{ metadata?: Record<string, unknown> }>
        updateFulfillment: (id: string, data: { metadata: Record<string, unknown> }) => Promise<unknown>
      }
      const existing = await fulfillmentModule.retrieveFulfillment(fulfillmentId)
      const events = Array.isArray(existing.metadata?.tracking_events)
        ? (existing.metadata?.tracking_events as unknown[])
        : []
      events.push({
        received_at: new Date().toISOString(),
        status: update.status,
        status_code: update.status_code,
        status_description: update.status_description,
        events: update.events,
      })
      await fulfillmentModule.updateFulfillment(fulfillmentId, {
        metadata: {
          ...(existing.metadata ?? {}),
          tracking_events: events,
          last_tracking_status: update.status,
          last_tracking_status_code: update.status_code,
          delivered_at: update.delivered_at ?? existing.metadata?.delivered_at,
        },
      })
    } catch (err) {
      logger.warn(`[shipengine-webhook] persist failed: ${(err as Error).message}`)
    }
  }

  // Emit downstream events. Subscribers wire emails (Sprint 4 templates).
  if (orderId) {
    const eventBus = req.scope.resolve(Modules.EVENT_BUS) as {
      emit(events: { name: string; data: Record<string, unknown> }[]): Promise<void>
    }
    try {
      if (update.status === "delivered") {
        await eventBus.emit([{
          name: "order.delivered",
          data: { id: orderId, tracking_number: update.tracking_number, delivered_at: update.delivered_at },
        }])
      } else if (update.status === "exception") {
        await eventBus.emit([{
          name: "order.shipment_exception",
          data: {
            id: orderId,
            tracking_number: update.tracking_number,
            status_description: update.status_description,
          },
        }])
      }
    } catch (err) {
      logger.warn(`[shipengine-webhook] emit failed: ${(err as Error).message}`)
    }
  }

  res.status(200).json({ ok: true, status: update.status })
}
