import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * GET /health/ready
 *
 * Readiness probe. Returns 200 only when DB and event bus (Redis) are
 * reachable. Used by load balancers / docker-compose `service_healthy`
 * gates so traffic is only routed once dependencies are warm.
 *
 * Distinct from /health/live: a degraded ready response means "drain me,
 * don't kill me" — the container is alive but not safe to receive traffic.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const checks: Record<string, { status: "ok" | "fail"; error?: string }> = {}

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
      graph: (args: {
        entity: string
        fields: string[]
        pagination?: { take?: number }
      }) => Promise<unknown>
    }
    await query.graph({ entity: "currency", fields: ["code"], pagination: { take: 1 } })
    checks.database = { status: "ok" }
  } catch (err) {
    checks.database = { status: "fail", error: (err as Error).message }
  }

  try {
    const eventBus = req.scope.resolve(Modules.EVENT_BUS) as
      | { ping?: () => Promise<unknown> }
      | undefined
    if (eventBus && typeof eventBus.ping === "function") {
      await eventBus.ping()
    }
    checks.redis = { status: "ok" }
  } catch (err) {
    checks.redis = { status: "fail", error: (err as Error).message }
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok")
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    service: "backend",
    timestamp: new Date().toISOString(),
    checks,
  })
}
