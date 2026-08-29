/**
 * ShipEngine carrier pickup scheduling helpers.
 *
 * Standalone (not part of the IFulfillmentProvider contract — Medusa's
 * fulfillment module has no pickup-scheduling concept). Uses the same
 * getShipEngineClient() factory as the fulfillment provider, so it
 * transparently uses the stub client in local dev/CI when no
 * SHIPENGINE_API_KEY is configured.
 */

import { getShipEngineClient } from "./factory"
import type {
  ShipEngineContactDetails,
  ShipEnginePickup,
  ShipEnginePickupAvailability,
} from "./types"

// Defaults mirror the shipengine provider's ship-from identity configured in
// medusa-config.ts (from_name/from_phone/from_email) — this is who the
// carrier should contact about the pickup. Standalone helpers have no
// site-config DI access, so these are the same static/env fallbacks used
// there; callers can override via schedulePickupForFulfillments's optional
// contactDetails param.
function defaultContactDetails(): ShipEngineContactDetails {
  return {
    name: "Hops & Glory",
    phone: "+61 400 000 000",
    email: process.env.SHIPPING_FROM_EMAIL || "orders@hopsandglory.au",
  }
}

export type PickupEligibleFulfillment = {
  id: string
  data?: Record<string, unknown> | null
}

export class PickupIneligibleError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = "PickupIneligibleError"
  }
}

function extractLabelInfo(fulfillment: PickupEligibleFulfillment): {
  carrierId: string
  labelId: string
} {
  const data = fulfillment.data ?? {}
  const carrierId = data.carrier_id as string | undefined
  const labelId = data.label_id as string | undefined
  if (!carrierId || !labelId) {
    throw new PickupIneligibleError(
      `fulfillment ${fulfillment.id} has no ShipEngine carrier_id/label_id — not eligible for pickup scheduling`
    )
  }
  return { carrierId, labelId }
}

/**
 * Gets the carrier's next available pickup window. Falls back to a generic
 * next-business-day 9am-5pm window if the carrier doesn't support the
 * availability endpoint (not all ShipEngine carriers do).
 */
export async function getPickupAvailabilityForCarrier(
  carrierId: string,
  shipDate?: string
): Promise<ShipEnginePickupAvailability> {
  const client = getShipEngineClient()
  return client.getPickupAvailability(carrierId, shipDate ? { ship_date: shipDate } : undefined)
}

/**
 * Schedules a single pickup covering one or more fulfillments that share the
 * same carrier. Throws PickupIneligibleError if any fulfillment lacks a
 * ShipEngine label, or if the fulfillments span multiple carriers.
 */
export async function schedulePickupForFulfillments(
  fulfillments: PickupEligibleFulfillment[],
  pickupWindow?: { start_at: string; end_at: string },
  contactDetails?: ShipEngineContactDetails
): Promise<ShipEnginePickup> {
  if (!fulfillments.length) {
    throw new PickupIneligibleError("no fulfillments provided")
  }

  const infos = fulfillments.map(extractLabelInfo)
  const carrierId = infos[0].carrierId
  const mismatched = infos.find((i) => i.carrierId !== carrierId)
  if (mismatched) {
    throw new PickupIneligibleError(
      "all fulfillments in a single pickup request must share the same carrier_id"
    )
  }

  const client = getShipEngineClient()

  let window = pickupWindow
  if (!window) {
    const availability = await client.getPickupAvailability(carrierId)
    const firstWindow = availability.pickup_window?.[0]
    if (!firstWindow) {
      throw new PickupIneligibleError(`no pickup availability returned for carrier ${carrierId}`)
    }
    window = { start_at: firstWindow.start_at, end_at: firstWindow.end_at }
  }

  return client.requestPickup({
    carrier_id: carrierId,
    label_ids: infos.map((i) => i.labelId),
    pickup_window: window,
    contact_details: contactDetails ?? defaultContactDetails(),
  })
}

export async function listPickupsForCarrier(carrierId?: string): Promise<ShipEnginePickup[]> {
  const client = getShipEngineClient()
  return client.listPickups(carrierId ? { carrier_id: carrierId } : undefined)
}

export async function cancelPickup(
  pickupId: string
): Promise<{ approved: boolean; message?: string }> {
  const client = getShipEngineClient()
  return client.cancelPickup(pickupId)
}
