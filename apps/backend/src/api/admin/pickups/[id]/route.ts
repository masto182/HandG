import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { cancelPickup } from "../../../../modules/shipengine"

/**
 * DELETE /admin/pickups/:id
 *
 * Cancels a scheduled ShipEngine pickup by pickup_id and clears
 * metadata.pickup on any fulfillment that referenced it.
 *
 * workflow-exempt: admin-triggered external carrier call + metadata write.
 */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const pickupId = req.params.id

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
    const result = await cancelPickup(pickupId)

    const affected = await query.graph({
      entity: "fulfillment",
      fields: ["id", "metadata"],
      filters: { provider_id: "shipengine_shipengine" },
    })
    const toClear = (affected.data ?? []).filter(
      (f) =>
        (f.metadata as Record<string, unknown> | null | undefined)?.pickup &&
        ((f.metadata as Record<string, unknown>).pickup as { pickup_id?: string }).pickup_id ===
          pickupId
    ) as Array<{ id: string; metadata?: Record<string, unknown> }>

    const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT) as {
      updateFulfillment: (
        id: string,
        data: { metadata: Record<string, unknown> }
      ) => Promise<unknown>
    }

    for (const f of toClear) {
      const { pickup: _pickup, ...restMetadata } = f.metadata ?? {}
      await fulfillmentModule.updateFulfillment(f.id, { metadata: restMetadata }) // workflow-exempt
    }

    res.json({ ok: true, ...result, cleared_fulfillments: toClear.map((f) => f.id) })
  } catch (err) {
    logger.error(`[pickups] DELETE failed: ${(err as Error).message}`)
    res.status(502).json({ message: (err as Error).message, code: "pickup_cancel_error" })
  }
}
