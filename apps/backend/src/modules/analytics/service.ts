import { MedusaService } from "@medusajs/framework/utils"
import StorefrontEvent from "./models/storefront-event"
import { mergeSessionCustomers } from "./lib/merge-session-customers"

type RawConnection = {
  raw: (sql: string, bindings?: unknown[]) => Promise<unknown>
}

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

class AnalyticsModuleService extends MedusaService({ StorefrontEvent }) {
  protected pgConnection_: RawConnection | null = null

  constructor(...args: any[]) {
    super(...args)
    this.pgConnection_ = args[0]?.__pg_connection__ ?? null
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
