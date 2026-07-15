// Integration HTTP test runner.
//
// Why this exists: medusaIntegrationTestRunner bootstraps a full Medusa app in
// each spec's beforeAll. Running multiple bootstraps in the SAME process can
// corrupt shared JS intrinsics. Running each spec file in its own jest process
// avoids cross-suite realm pollution.
//
// Usage:
//   node integration-tests/run-http.mjs                 # run all http specs
//   node integration-tests/run-http.mjs site-config     # run one (by basename)

import { spawnSync } from "node:child_process"
import { readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const httpDir = join(dirname(fileURLToPath(import.meta.url)), "http")

const filter = process.argv.slice(2)
const allSpecs = readdirSync(httpDir).filter((f) => f.endsWith(".spec.ts"))
const specs = filter.length
  ? allSpecs.filter((f) => filter.some((arg) => f.includes(arg)))
  : allSpecs

if (specs.length === 0) {
  console.error(`No integration http specs matched: ${filter.join(", ")}`)
  process.exit(1)
}

const results = []
for (const spec of specs) {
  const rel = `integration-tests/http/${spec}`
  console.log(`\n=== integration:http :: ${spec} ===`)
  const res = spawnSync(
    "pnpm",
    ["exec", "jest", "--runInBand", "--forceExit", rel],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        TEST_TYPE: "integration:http",
        NODE_ENV: "test",
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --experimental-vm-modules`.trim(),
      },
    }
  )
  results.push({ spec, status: res.status ?? 1 })
}

const failed = results.filter((r) => r.status !== 0)
console.log("\n=== integration:http summary ===")
for (const r of results) {
  console.log(`${r.status === 0 ? "PASS" : "FAIL"}  ${r.spec}`)
}
process.exit(failed.length > 0 ? 1 : 0)
