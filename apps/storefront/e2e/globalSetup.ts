/* eslint-disable no-console */
import type { FullConfig } from "@playwright/test"
import { execSync } from "child_process"
import * as path from "path"

/**
 * Playwright global setup.
 *
 *  1. Run the idempotent E2E product seed so specs can rely on three known
 *     handles being present at known prices and stock levels.
 *  2. Health-check the backend (/health) and storefront root.
 *
 * Failures here abort the run before any spec can produce a misleading red.
 */

// ── Local dev env defaults ────────────────────────────────────────────────────
// Provide fallback values so the test suite works without requiring every key
// to be exported in the calling shell. Real CI values take precedence because
// we only set when the var is absent (not override: true).
if (!process.env.MEILI_MASTER_KEY)
  process.env.MEILI_MASTER_KEY = "meili_dev_master_key"
if (!process.env.MEILI_URL) process.env.MEILI_URL = "http://localhost:7700"
if (!process.env.PLAYWRIGHT_BACKEND_URL)
  process.env.PLAYWRIGHT_BACKEND_URL = "http://localhost:9000"
if (!process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY)
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY =
    "pk_db28b95436c4bc6bae3cbb4ac258fc52ac8a7e9cd2344415aa757f497f35ded6"
// ─────────────────────────────────────────────────────────────────────────────

const BACKEND_URL =
  process.env.PLAYWRIGHT_BACKEND_URL || "http://localhost:9000"
const STOREFRONT_URL =
  process.env.PLAYWRIGHT_STOREFRONT_URL || "http://localhost:8000"

async function pingOk(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let last: any = null
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "GET" })
      if (res.ok || res.status === 404) return
      last = `status ${res.status}`
    } catch (e: any) {
      last = e?.message || String(e)
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`Health check failed for ${url}: ${last}`)
}

async function globalSetup(_config: FullConfig) {
  if (process.env.SKIP_E2E_SEED === "true") {
    console.log("[globalSetup] SKIP_E2E_SEED=true — skipping seed")
  } else {
    const backendDir = path.resolve(__dirname, "../../backend")
    const env = { ...process.env }
    const exec = (cmd: string) =>
      execSync(cmd, { cwd: backendDir, stdio: "inherit", env })
    console.log("[globalSetup] Seeding VIP early-access offsets...")
    exec("pnpm exec medusa exec ./src/scripts/seed-vip-config.ts")
    console.log("[globalSetup] Seeding beer styles...")
    exec("pnpm exec medusa exec ./src/scripts/seed-beer-styles.ts")
    console.log("[globalSetup] Seeding hops...")
    exec("pnpm exec medusa exec ./src/scripts/seed-hops.ts")
    console.log("[globalSetup] Seeding E2E products...")
    exec("pnpm exec medusa exec ./src/scripts/seed-e2e-products.ts")
    // Reindex AFTER hops + products are seeded so MeiliSearch facet data
    // (notably hop_countries) reflects the freshly-created hop links. The
    // filter panel's Hop Origin checkboxes are driven by this facet
    // distribution, so a stale index renders zero origin chips.
    console.log("[globalSetup] Reindexing search...")
    exec("pnpm exec medusa exec ./src/scripts/reindex-search.ts")
  }

  console.log(`[globalSetup] Health-checking ${BACKEND_URL}/health ...`)
  await pingOk(`${BACKEND_URL}/health`)
  console.log(`[globalSetup] Health-checking ${STOREFRONT_URL}/ ...`)
  await pingOk(`${STOREFRONT_URL}/`)
  console.log("[globalSetup] OK")
}

export default globalSetup
