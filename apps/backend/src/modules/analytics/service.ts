import { randomUUID } from "node:crypto"
import { MedusaService } from "@medusajs/framework/utils"
import StorefrontEvent from "./models/storefront-event"
import StorefrontSession from "./models/storefront-session"
import { mergeSessionCustomers } from "./lib/merge-session-customers"

type RawConnection = {
  raw: (sql: string, bindings?: unknown[]) => Promise<unknown>
}

type RecordEventInput = {
  event_type: string
  session_id: string
  customer_id: string | null
  payload: Record<string, unknown>
  event_id?: string | null
}

type HeartbeatInput = {
  session_id: string
  customer_id: string | null
  path?: string | null
  referrer?: string | null
}

// Cap accrual per heartbeat call so a laptop left open overnight (visibility
// hidden but heartbeat somehow still firing, or clock skew) can't inflate duration.
const MAX_HEARTBEAT_ACCRUAL_SECONDS = 90

type RecentEventOptions = {
  since: Date
  eventTypes?: string[]
  batchSize?: number
  maxResults?: number
}

type MemberActivityEventOptions = {
  since: Date
  eventTypes?: string[]
  directLimit?: number
  sessionLimit?: number
}

function normalizeRows(result: unknown): any[] {
  if (Array.isArray(result)) {
    return result
  }

  if (result && typeof result === "object" && Array.isArray((result as any).rows)) {
    return (result as any).rows
  }

  return []
}

function buildInClause(values: unknown[]): string {
  return values.map(() => "?").join(", ")
}

function clamp(value: number | undefined, fallback: number, max: number): number {
  const resolved = value ?? fallback
  return Math.max(1, Math.min(resolved, max))
}

class AnalyticsModuleService extends MedusaService({ StorefrontEvent, StorefrontSession }) {
  protected pgConnection_: RawConnection | null = null

  constructor(...args: any[]) {
    super(...args)
    this.pgConnection_ = args[0]?.__pg_connection__ ?? null
  }

  /**
   * Insert a storefront event, ignoring duplicates by event_id (client-generated
   * UUID). Without this, retries/keepalive re-sends silently inflate every
   * funnel and rate computed downstream.
   */
  async recordStorefrontEvent(input: RecordEventInput): Promise<void> {
    const connection = this.requirePgConnection()
    await connection.raw(
      `
        INSERT INTO storefront_event (id, event_type, session_id, customer_id, payload, event_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, now(), now())
        ON CONFLICT (event_id) WHERE event_id IS NOT NULL DO NOTHING
      `,
      [
        randomUUID(),
        input.event_type,
        input.session_id,
        input.customer_id,
        JSON.stringify(input.payload ?? {}),
        input.event_id ?? null,
      ]
    )
  }

  /**
   * Upsert session state on heartbeat/page-view. First call for a session_id
   * sets started_at/entry_path; every call bumps last_seen_at and accrues a
   * capped active_seconds delta.
   */
  async upsertSession(input: HeartbeatInput): Promise<void> {
    const connection = this.requirePgConnection()
    await connection.raw(
      `
        INSERT INTO storefront_session (
          id, customer_id, started_at, last_seen_at, ended_at,
          page_count, active_seconds, entry_path, last_path, referrer,
          created_at, updated_at
        )
        VALUES (?, ?, now(), now(), NULL, 1, 0, ?, ?, ?, now(), now())
        ON CONFLICT (id) DO UPDATE SET
          customer_id = COALESCE(EXCLUDED.customer_id, storefront_session.customer_id),
          last_path = COALESCE(EXCLUDED.last_path, storefront_session.last_path),
          page_count = storefront_session.page_count +
            CASE WHEN EXCLUDED.last_path IS NOT NULL AND EXCLUDED.last_path IS DISTINCT FROM storefront_session.last_path
              THEN 1 ELSE 0 END,
          active_seconds = storefront_session.active_seconds +
            LEAST(
              ${MAX_HEARTBEAT_ACCRUAL_SECONDS},
              GREATEST(0, EXTRACT(EPOCH FROM (now() - storefront_session.last_seen_at))::int)
            ),
          last_seen_at = now(),
          ended_at = NULL,
          updated_at = now()
        WHERE storefront_session.deleted_at IS NULL
      `,
      [
        input.session_id,
        input.customer_id,
        input.path ?? null,
        input.path ?? null,
        input.referrer ?? null,
      ]
    )
  }

  async listMemberSessions(customerId: string, limit = 50): Promise<any[]> {
    const connection = this.requirePgConnection()
    const result = await connection.raw(
      `
        SELECT id, customer_id, started_at, last_seen_at, ended_at, page_count, active_seconds, entry_path, last_path, referrer
        FROM storefront_session
        WHERE deleted_at IS NULL AND customer_id = ?
        ORDER BY last_seen_at DESC
        LIMIT ?
      `,
      [customerId, clamp(limit, 50, 200)]
    )
    return normalizeRows(result)
  }

  async getLastActiveByCustomerIds(customerIds: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>()
    const uniqueIds = [...new Set(customerIds)].filter(Boolean)
    if (!uniqueIds.length) return result

    const connection = this.requirePgConnection()
    const raw = await connection.raw(
      `
        SELECT customer_id, MAX(last_seen_at) AS last_seen_at
        FROM storefront_session
        WHERE deleted_at IS NULL AND customer_id IN (${buildInClause(uniqueIds)})
        GROUP BY customer_id
      `,
      uniqueIds
    )
    for (const row of normalizeRows(raw)) {
      if (row.customer_id && row.last_seen_at) {
        result.set(row.customer_id, new Date(row.last_seen_at).toISOString())
      }
    }
    return result
  }

  async listRecentlyActiveCustomers(since: Date, limit = 10): Promise<any[]> {
    const connection = this.requirePgConnection()
    const result = await connection.raw(
      `
        SELECT customer_id, MAX(last_seen_at) AS last_seen_at, MAX(last_path) AS last_path
        FROM storefront_session
        WHERE deleted_at IS NULL AND customer_id IS NOT NULL AND last_seen_at >= ?
        GROUP BY customer_id
        ORDER BY MAX(last_seen_at) DESC
        LIMIT ?
      `,
      [since.toISOString(), clamp(limit, 10, 50)]
    )
    return normalizeRows(result)
  }

  async listRecentStorefrontEvents(options: RecentEventOptions): Promise<any[]> {
    const batchSize = clamp(options.batchSize, 500, 1000)
    const maxResults = clamp(options.maxResults, 5000, 10000)
    const whereParts = ["deleted_at IS NULL", "created_at >= ?"]
    const bindings: unknown[] = [options.since.toISOString()]

    if (options.eventTypes?.length) {
      whereParts.push(`event_type IN (${buildInClause(options.eventTypes)})`)
      bindings.push(...options.eventTypes)
    }

    return this.queryStorefrontEvents(whereParts.join(" AND "), bindings, batchSize, maxResults)
  }

  async listMemberActivityEvents(
    customerId: string,
    options: MemberActivityEventOptions
  ): Promise<any[]> {
    const directLimit = clamp(options.directLimit, 500, 2000)
    const sessionLimit = clamp(options.sessionLimit, 500, 3000)
    const recentCustomerEvents = await this.queryStorefrontEvents(
      [
        "deleted_at IS NULL",
        "created_at >= ?",
        "customer_id = ?",
        ...(options.eventTypes?.length
          ? [`event_type IN (${buildInClause(options.eventTypes)})`]
          : []),
      ].join(" AND "),
      [options.since.toISOString(), customerId, ...(options.eventTypes ?? [])],
      directLimit,
      directLimit
    )

    const sessionIds = [
      ...new Set(
        recentCustomerEvents
          .map((event) => event.session_id)
          .filter(
            (sessionId): sessionId is string =>
              typeof sessionId === "string" && !!sessionId && !sessionId.startsWith("server:")
          )
      ),
    ]

    if (!sessionIds.length) {
      return recentCustomerEvents
    }

    const recentAnonymousSessionEvents = await this.queryStorefrontEvents(
      [
        "deleted_at IS NULL",
        "created_at >= ?",
        "customer_id IS NULL",
        `session_id IN (${buildInClause(sessionIds)})`,
        ...(options.eventTypes?.length
          ? [`event_type IN (${buildInClause(options.eventTypes)})`]
          : []),
      ].join(" AND "),
      [options.since.toISOString(), ...sessionIds, ...(options.eventTypes ?? [])],
      sessionLimit,
      sessionLimit
    )

    return [...recentCustomerEvents, ...recentAnonymousSessionEvents].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    )
  }

  private async queryStorefrontEvents(
    whereSql: string,
    bindings: unknown[],
    batchSize: number,
    maxResults: number
  ): Promise<any[]> {
    const connection = this.requirePgConnection()
    const rows: any[] = []
    let offset = 0

    while (rows.length < maxResults) {
      const remaining = maxResults - rows.length
      const limit = Math.min(batchSize, remaining)
      const result = await connection.raw(
        `
          SELECT id, event_type, session_id, customer_id, payload, created_at, updated_at
          FROM storefront_event
          WHERE ${whereSql}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `,
        [...bindings, limit, offset]
      )
      const batch = normalizeRows(result)
      rows.push(...batch)

      if (batch.length < limit) {
        break
      }

      offset += batch.length
    }

    return rows
  }

  private requirePgConnection(): RawConnection {
    if (!this.pgConnection_) {
      throw new Error("analytics postgres connection unavailable")
    }

    return this.pgConnection_
  }
}

export default AnalyticsModuleService
export { mergeSessionCustomers }
