import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /health/live
 *
 * Liveness probe. Returns 200 as long as the HTTP server is accepting
 * connections. Should NEVER touch dependencies — if it does, a transient
 * Postgres blip will cause the orchestrator to restart the container.
 *
 * Used by container runtimes / Kubernetes / docker-compose for the
 * "is the process wedged?" check.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.status(200).json({
    status: "ok",
    service: "backend",
    timestamp: new Date().toISOString(),
  })
}
