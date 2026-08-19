/**
 * Shared constants + environment checks for the production-load script family:
 *   load-doctor.ts, prep-beers.ts, load-to-production.ts
 *
 * Centralised here because every value below was hard-won by trial and error
 * in a real production load session — do not rediscover these by guessing.
 */
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { execSync } from "child_process"
import * as dotenv from "dotenv"

// Load ~/.env first, then apps/backend/.env (latter wins on conflict) — matches
// the pattern used by refresh-untappd-cookie.ts / upload-images-to-production.ts.
dotenv.config({ path: path.join(os.homedir(), ".env") })
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") })

// ── Production access ───────────────────────────────────────────────────────
export const SSH_KEY = path.join(os.homedir(), ".ssh", "ssh-key-2026-07-06.key")
export const PROD_HOST = "ubuntu@159.13.63.42"
export const DEPLOY_DIR = "/opt/retail-example"
export const COMPOSE = "docker compose -f docker-compose.prod.yml --env-file .env.production"
export const PG_CONTAINER = "retail-example-postgres-1"
export const PG_EXEC = `docker exec ${PG_CONTAINER} psql -U medusa -c`

// Container's cwd is apps/backend, NOT /app — confirmed by trial error. Any
// bind-mounted CSV must land here or medusa exec reports "CSV file not found".
export const CSV_MOUNT = "/app/apps/backend/data/us-beers-import.csv"

// Australia / AUD region — used to fetch calculated_price in store API checks.
export const REGION_ID = "reg_01KX8VNCWMRRRZ9NSYCYJNP35H"
export const PUBLISHABLE_KEY =
  process.env.MEDUSA_PUBLISHABLE_KEY ??
  "pk_dd08ef535151997639b8ba1e3bb94c09384a9c8daad84f1c2a7b74fadfdc1d4f"

export const PROD_URL = (process.env.MEDUSA_PROD_URL ?? "https://hopsandglory.au").replace(
  /\/$/,
  ""
)
export const PROD_ADMIN_EMAIL =
  process.env.MEDUSA_PROD_ADMIN_EMAIL ?? process.env.MEDUSA_ADMIN_EMAIL ?? ""
export const PROD_ADMIN_PASSWORD =
  process.env.MEDUSA_PROD_ADMIN_PASSWORD ?? process.env.MEDUSA_ADMIN_PASSWORD ?? ""

export const YOLO_DETECT_URL = process.env.YOLO_DETECT_URL ?? "http://192.168.2.45:8765/detect"
export const YOLO_HEALTH_URL = YOLO_DETECT_URL.replace(/\/detect$/, "/health")

// scp is BLOCKED by org policy on this machine. Never shell out to scp — use
// `ssh <host> "cat > /tmp/file" < localfile` for pushing text files instead.
export const SCP_IS_BLOCKED = true

// ── Check result types ──────────────────────────────────────────────────────
export type CheckStatus = "PASS" | "WARN" | "FAIL"
export interface CheckResult {
  name: string
  status: CheckStatus
  detail: string
  fixHint?: string
}

function run(cmd: string, timeoutMs = 8000): { ok: boolean; out: string } {
  try {
    const out = execSync(cmd, { timeout: timeoutMs, stdio: ["ignore", "pipe", "pipe"] }).toString()
    return { ok: true, out }
  } catch (e: any) {
    return { ok: false, out: e.stdout?.toString() ?? e.message ?? String(e) }
  }
}

function sshRun(remoteCmd: string, timeoutMs = 8000): { ok: boolean; out: string } {
  return run(
    `ssh -i ${SSH_KEY} -o BatchMode=yes -o ConnectTimeout=5 ${PROD_HOST} "${remoteCmd.replace(/"/g, '\\"')}"`,
    timeoutMs
  )
}

/**
 * Runs the full environment/tool preflight. `quick=true` skips slow network
 * checks (YOLO health, Untappd auth ping) — use quick mode as phase 0 inside
 * prep-beers.ts / load-to-production.ts; use full mode for standalone
 * `pnpm load-doctor`.
 */
export async function checkEnvironment(opts: { quick?: boolean } = {}): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  const backendDir = path.join(__dirname, "..", "..")

  // 1. tsx available (cwd matters — process.cwd() is read by several scripts)
  const tsxPath = path.join(backendDir, "node_modules", ".bin", "tsx")
  results.push(
    fs.existsSync(tsxPath)
      ? { name: "tsx available", status: "PASS", detail: tsxPath }
      : {
          name: "tsx available",
          status: "FAIL",
          detail: `not found at ${tsxPath}`,
          fixHint:
            "Run from apps/backend/ and `pnpm install` — never use ts-node, it is not installed.",
        }
  )

  // 2. Node version matches .node-version (fnm)
  const nodeVersionFile = path.join(backendDir, "..", "..", ".node-version")
  if (fs.existsSync(nodeVersionFile)) {
    const wanted = fs.readFileSync(nodeVersionFile, "utf-8").trim()
    const actual = process.version.replace(/^v/, "")
    results.push(
      actual.startsWith(wanted.split(".").slice(0, 2).join("."))
        ? { name: "Node version", status: "PASS", detail: `v${actual} (wanted ${wanted})` }
        : {
            name: "Node version",
            status: "WARN",
            detail: `running v${actual}, .node-version wants ${wanted}`,
            fixHint: 'eval "$(fnm env)" && fnm use',
          }
    )
  }

  // 3. SSH key present + prod reachable
  if (!fs.existsSync(SSH_KEY)) {
    results.push({
      name: "SSH key present",
      status: "FAIL",
      detail: SSH_KEY,
      fixHint: `Confirm you have ${SSH_KEY} — this is the key used for all production access.`,
    })
  } else {
    const r = sshRun("echo ok")
    results.push(
      r.ok && r.out.includes("ok")
        ? { name: "Production SSH reachable", status: "PASS", detail: PROD_HOST }
        : {
            name: "Production SSH reachable",
            status: "FAIL",
            detail: r.out.trim().slice(0, 200),
            fixHint: `Check network access and that ${SSH_KEY} is authorized on ${PROD_HOST}.`,
          }
    )
  }

  // 4. scp blocked — informational only, never a failure
  results.push({
    name: "scp availability",
    status: "WARN",
    detail: "scp is blocked by org policy on this machine — this is expected",
    fixHint:
      'All scripts here use `ssh <host> "cat > file" < local` instead of scp. No action needed.',
  })

  // 5. Prod docker services up
  {
    const r = sshRun(`cd ${DEPLOY_DIR} && ${COMPOSE} ps --status running --format json`)
    const expected = ["backend", "postgres", "meilisearch", "storefront", "caddy"]
    if (!r.ok) {
      results.push({
        name: "Production docker services",
        status: "FAIL",
        detail: "could not query docker compose ps",
        fixHint: "Check SSH access and that /opt/retail-example exists on the host.",
      })
    } else {
      const running = expected.filter((svc) => r.out.includes(`"${svc}"`) || r.out.includes(svc))
      const missing = expected.filter((svc) => !running.includes(svc))
      results.push(
        missing.length === 0
          ? { name: "Production docker services", status: "PASS", detail: expected.join(", ") }
          : {
              name: "Production docker services",
              status: "FAIL",
              detail: `down: ${missing.join(", ")}`,
              fixHint: `ssh ${PROD_HOST} "cd ${DEPLOY_DIR} && ${COMPOSE} up -d ${missing.join(" ")}"`,
            }
      )
    }
  }

  // 6. Prod admin credentials resolvable
  results.push(
    PROD_ADMIN_EMAIL && PROD_ADMIN_PASSWORD
      ? { name: "Prod admin credentials", status: "PASS", detail: PROD_ADMIN_EMAIL }
      : {
          name: "Prod admin credentials",
          status: "FAIL",
          detail: "MEDUSA_PROD_ADMIN_EMAIL / MEDUSA_PROD_ADMIN_PASSWORD not resolved",
          fixHint:
            'Set in ~/.env or export before running. Known NOT to reliably auto-load from ~/.env for upload-images-to-production.ts — pass explicitly on the command line if load-to-prod still fails after this check passes. Password contains "!" — single-quote it in zsh.',
        }
  )

  // 7. GEMINI_API_KEY set
  results.push(
    !!process.env.GEMINI_API_KEY
      ? { name: "GEMINI_API_KEY set", status: "PASS", detail: "present" }
      : {
          name: "GEMINI_API_KEY set",
          status: "FAIL",
          detail: "missing",
          fixHint:
            "Required for v9 pipeline scoring (process-production-images.ts). Add to apps/backend/.env.",
        }
  )

  // 8. Local write paths exist
  for (const rel of ["data/product-images", "data/image-selection"]) {
    const p = path.join(backendDir, rel)
    results.push(
      fs.existsSync(p)
        ? { name: `Local path ${rel}`, status: "PASS", detail: p }
        : {
            name: `Local path ${rel}`,
            status: "WARN",
            detail: `${p} does not exist — will be created`,
          }
    )
  }

  if (opts.quick) return results

  // 9. UNTAPPD_COOKIE set (slow-ish, network round trip not attempted here —
  // just presence check; a real auth ping is left to the scraper itself)
  results.push(
    !!process.env.UNTAPPD_COOKIE
      ? { name: "UNTAPPD_COOKIE set", status: "PASS", detail: "present" }
      : {
          name: "UNTAPPD_COOKIE set",
          status: "FAIL",
          detail: "missing",
          fixHint: "Run: npx tsx scripts/refresh-untappd-cookie.ts",
        }
  )

  // 10. YOLO detection server reachable
  {
    const r = run(`curl -s -o /dev/null -w '%{http_code}' --max-time 5 ${YOLO_HEALTH_URL}`)
    results.push(
      r.ok && r.out.trim() === "200"
        ? { name: "YOLO detection server", status: "PASS", detail: YOLO_HEALTH_URL }
        : {
            name: "YOLO detection server",
            status: "FAIL",
            detail: `unreachable at ${YOLO_HEALTH_URL}`,
            fixHint:
              'ssh administrator@192.168.2.45 "python C:/detect_server.py" (run in background)',
          }
    )
  }

  // 11. Postgres query access from prod (validates the diagnostic path used
  // throughout troubleshooting docs actually works before you need it)
  {
    const r = sshRun(`${PG_EXEC} "select 1;"`)
    results.push(
      r.ok && r.out.includes("1")
        ? { name: "Postgres query access", status: "PASS", detail: PG_CONTAINER }
        : {
            name: "Postgres query access",
            status: "FAIL",
            detail: r.out.trim().slice(0, 200),
            fixHint: `Confirm ${PG_CONTAINER} is the correct container name — check with: ssh ${PROD_HOST} "docker ps --format '{{.Names}}'"`,
          }
    )
  }

  return results
}

// ── Brewery resolution ──────────────────────────────────────────────────────
// Keep in sync with BREWERY_NAMES in scrape-untappd-images.ts. Free-text
// brewery names from a spreadsheet get matched (case-insensitively, against
// either the scraper key or the display name) to resolve which scraper key
// to use for handle derivation and UNTAPPD_URL_OVERRIDES.
export const BREWERY_NAMES: Record<string, string> = {
  lolev: "Lolev",
  fidens: "Fidens Brewing",
  monkish: "Monkish Brewing",
  brujos: "Brujos Brewing",
  hill_farmstead: "Hill Farmstead",
  north_park: "North Park Beer Co",
  troon: "Troon Brewing",
  human_robot: "Human Robot",
  bakes: "Bakes Brewing",
  rar: "RAR Brewing",
  fallside: "Fallside Brewing",
  tall_trees: "Tall Trees Brew Lab",
  threat: "Threat Level Midnight",
  off_script: "Off Script Brewing",
  trillium: "Trillium Brewing",
  freak_folk: "Freak Folk Brewing",
  messorem: "Messorem",
}

export function resolveBreweryKey(freeText: string): string | null {
  const norm = freeText.toLowerCase().trim()
  for (const [key, name] of Object.entries(BREWERY_NAMES)) {
    if (
      key === norm.replace(/\s+/g, "_") ||
      name.toLowerCase() === norm ||
      name.toLowerCase().startsWith(norm)
    ) {
      return key
    }
  }
  return null
}

// ── Handle derivation ───────────────────────────────────────────────────────
// There are TWO different handle-derivation algorithms in this codebase and
// they disagree on apostrophes. Using the wrong one for the wrong purpose is
// exactly what caused image files to silently not match production products
// in a real load. Always use the right one for the right side of the fence:

/**
 * scrape-untappd-images.ts's own deriveHandle() — apostrophes are STRIPPED
 * entirely (Couldn't -> couldnt). This is what the scraper and v9 pipeline use
 * to name their own output: UNTAPPD_URL_OVERRIDES keys, image-selection dirs,
 * pipeline-run-v9-[timestamp]/beers/[handle]/, pipeline-run-v9-[timestamp]/winners/[handle].jpg.
 * Use this whenever you're touching scraper/pipeline-side artifacts.
 */
export function deriveScraperHandle(breweryKey: string, beerName: string): string {
  const prefix = breweryKey.replace(/_/g, "-")
  const slug = beerName
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
  return `${prefix}-${slug}`
}

/**
 * import-us-beers.ts's slugify(`${breweryName}-${title}`) — apostrophes become
 * a HYPHEN, not stripped (Couldn't -> couldn-t). Confirmed this is what Medusa
 * actually stores as the product handle in production. Use this to PREDICT a
 * production handle, but always verify predictions against a live DB query —
 * never trust prediction alone for the final beerName -> handle mapping.
 */
export function deriveProductionHandle(breweryName: string, title: string): string {
  const combined = `${breweryName}-${title}`
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Normalizes a string for loose matching: lowercase, strip everything but
 * alphanumerics. Use this — not exact handle comparison — when reconciling
 * scraper handles against production handles, since it collapses both
 * derivation styles (stripped vs hyphenated apostrophes) to the same value. */
export function normalizeForMatch(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function printCheckResults(results: CheckResult[]): boolean {
  let ok = true
  for (const r of results) {
    const icon = r.status === "PASS" ? "✓" : r.status === "WARN" ? "⚠" : "✗"
    console.log(`  ${icon} ${r.status.padEnd(4)} ${r.name} — ${r.detail}`)
    if (r.status === "FAIL") {
      ok = false
      if (r.fixHint) console.log(`         fix: ${r.fixHint}`)
    } else if (r.status === "WARN" && r.fixHint) {
      console.log(`         note: ${r.fixHint}`)
    }
  }
  return ok
}
