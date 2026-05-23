/**
 * ShipEngine tracking webhook helpers.
 *
 * ShipEngine does NOT sign webhook payloads. Their recommended pattern is to
 * authenticate the caller via a shared secret embedded in the subscription URL
 * (query string) or via a custom header you can set when creating the
 * webhook. We accept either:
 *
 *   - x-shipengine-secret header        (preferred, easy to rotate)
 *   - ?secret=...        query param    (compat with ShipEngine UI patterns)
 *
 * The expected secret comes from env var SHIPENGINE_WEBHOOK_SECRET.
 *
 * https://www.shipengine.com/docs/tracking/webhooks/
 */

export type ShipEngineTrackingEvent = {
  occurred_at?: string
  carrier_occurred_at?: string
  description?: string
  city_locality?: string
  state_province?: string
  postal_code?: string
  country_code?: string
  company_name?: string
  signer?: string
  event_code?: string
}

export type ShipEngineWebhookPayload = {
  resource_url?: string
  resource_type?: string
  data?: {
    tracking_number?: string
    status_code?: string
    status_description?: string
    carrier_status_code?: string
    carrier_status_description?: string
    shipped_date?: string
    estimated_delivery_date?: string
    actual_delivery_date?: string
    exception_description?: string
    events?: ShipEngineTrackingEvent[]
  }
}

export type NormalizedTrackingUpdate = {
  tracking_number: string | null
  status_code: string | null
  status_description: string | null
  status: "in_transit" | "delivered" | "exception" | "unknown"
  delivered_at: string | null
  estimated_delivery_at: string | null
  events: ShipEngineTrackingEvent[]
  raw: ShipEngineWebhookPayload
}

/**
 * Verifies a webhook request was sent by a caller in possession of our shared
 * secret. Pure function; takes header + query string + expected secret.
 *
 * Returns { ok: true } when the secret matches via either channel; otherwise
 * { ok: false, reason: string } with a tag suitable for logging.
 */
export function verifyShipEngineWebhook(opts: {
  headerSecret: string | string[] | undefined
  querySecret: string | string[] | undefined
  expectedSecret: string | undefined
}): { ok: true } | { ok: false, reason: string } {
  if (!opts.expectedSecret) {
    return { ok: false, reason: "webhook_secret_not_configured" }
  }
  const header = Array.isArray(opts.headerSecret) ? opts.headerSecret[0] : opts.headerSecret
  const query = Array.isArray(opts.querySecret) ? opts.querySecret[0] : opts.querySecret
  const candidate = (header ?? query ?? "").toString()
  if (!candidate) return { ok: false, reason: "no_secret_provided" }
  // Constant-time compare to limit timing leaks. Length-mismatched secrets
  // also fail here.
  if (candidate.length !== opts.expectedSecret.length) {
    return { ok: false, reason: "secret_length_mismatch" }
  }
  let mismatch = 0
  for (let i = 0; i < candidate.length; i++) {
    mismatch |= candidate.charCodeAt(i) ^ opts.expectedSecret.charCodeAt(i)
  }
  if (mismatch !== 0) return { ok: false, reason: "secret_mismatch" }
  return { ok: true }
}

/**
 * Maps a ShipEngine status_code to one of our four canonical buckets.
 *
 * ShipEngine codes: AC (accepted), IT (in_transit), DE (delivered),
 * EX (exception), AT (attempted), UN (unknown), NY (not_yet).
 *
 * https://www.shipengine.com/docs/tracking/#tracking-status-codes
 */
export function mapShipEngineStatus(code: string | null | undefined): NormalizedTrackingUpdate["status"] {
  if (!code) return "unknown"
  const c = code.toUpperCase()
  if (c === "DE") return "delivered"
  if (c === "EX") return "exception"
  if (c === "AC" || c === "IT" || c === "AT") return "in_transit"
  return "unknown"
}

export function normalizeShipEngineWebhook(payload: ShipEngineWebhookPayload): NormalizedTrackingUpdate {
  const data = payload.data ?? {}
  const status = mapShipEngineStatus(data.status_code)
  return {
    tracking_number: data.tracking_number ?? null,
    status_code: data.status_code ?? null,
    status_description: data.status_description ?? data.carrier_status_description ?? null,
    status,
    delivered_at: status === "delivered" ? (data.actual_delivery_date ?? null) : null,
    estimated_delivery_at: data.estimated_delivery_date ?? null,
    events: Array.isArray(data.events) ? data.events : [],
    raw: payload,
  }
}
