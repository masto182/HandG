import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Readiness probe. Verifies upstream Medusa backend is reachable so the
 * load balancer can drain this storefront instance during a backend
 * outage instead of returning blank pages to users.
 */
export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const checks: Record<string, { status: "ok" | "fail"; error?: string }> = {}

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2000)
    const r = await fetch(`${backendUrl}/health/live`, { signal: ctrl.signal, cache: "no-store" })
    clearTimeout(t)
    checks.backend = r.ok ? { status: "ok" } : { status: "fail", error: `HTTP ${r.status}` }
  } catch (err) {
    checks.backend = { status: "fail", error: (err as Error).message }
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok")
  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", service: "storefront", timestamp: new Date().toISOString(), checks },
    { status: allOk ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  )
}
