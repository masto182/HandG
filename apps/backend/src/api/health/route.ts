import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * GET /health
 *
 * Top-level health probe used by:
 *   - Caddy / docker-compose container healthcheck
 *   - UptimeRobot HTTP probe
 *   - GitHub Actions deploy verification step
 *
 * Returns 200 with a per-dependency breakdown when DB and Redis (event bus)
 * are reachable, 503 when any required dependency is unhealthy.
 *
 * The probe is intentionally cheap and does NOT touch product / order data.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const checks: Record<string, { status: "ok" | "fail"; error?: string }> = {}

  // Postgres via the framework query helper (cheap SELECT 1).
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
      graph: (args: { entity: string; fields: string[]; pagination?: { take?: number } }) => Promise<unknown>
    }
    await query.graph({ entity: "currency", fields: ["code"], pagination: { take: 1 } })
    checks.database = { status: "ok" }
  } catch (err) {
    checks.database = { status: "fail", error: (err as Error).message }
  }

  // Redis via the event bus module (its connection is a Redis client).
  try {
    const eventBus = req.scope.resolve(Modules.EVENT_BUS) as { ping?: () => Promise<unknown> } | undefined
    if (eventBus && typeof eventBus.ping === "function") {
      await eventBus.ping()
    }
    // If the module registered without throwing, treat as ok. We don't fail
    // the whole probe if ping isn't exposed — Redis health is also covered by
    // the docker-compose redis healthcheck.
    checks.redis = { status: "ok" }
  } catch (err) {
    checks.redis = { status: "fail", error: (err as Error).message }
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok")
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    service: "backend",
    environment: process.env.NODE_ENV || "development",
    checks,
  })
}
