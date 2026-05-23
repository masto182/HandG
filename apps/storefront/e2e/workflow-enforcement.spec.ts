import { test, expect } from "@playwright/test"
import { execSync } from "child_process"
import path from "path"

const BACKEND_API = path.resolve(__dirname, "../../backend/src/api")

test.describe("Workflow-Only Enforcement — No Direct Mutations in API Routes", () => {
  test("No direct .create/.update/.delete service calls in route handlers", () => {
    const result = execSync(
      `grep -rn "Service\\|Module" "${BACKEND_API}" --include="route.ts" | ` +
      `grep -E "\\.(create|update|delete|softDelete|remove)" | ` +
      `grep -v "workflow-exempt" | ` +
      `grep -v "Workflow" | ` +
      `grep -v "node_modules" || true`,
      { encoding: "utf-8" }
    ).trim()

    const violations = result.split("\n").filter(Boolean)
    expect(
      violations,
      `Found ${violations.length} direct mutation calls in API routes (must use workflows):\n${violations.join("\n")}`
    ).toHaveLength(0)
  })

  test("All POST/PUT/DELETE route handlers import a workflow", () => {
    const result = execSync(
      `for f in $(grep -rl "export async function POST\\|export async function PUT\\|export async function DELETE" "${BACKEND_API}" --include="route.ts" 2>/dev/null); do ` +
      `grep -qiE "workflow|Workflow" "$f" || echo "$f"; ` +
      `done 2>/dev/null || true`,
      { encoding: "utf-8" }
    ).trim()

    const violations = result
      .split("\n")
      .filter(Boolean)
      .filter((v) => !v.includes("/health/") && !v.includes("/custom/") && !v.includes("/search/"))

    expect(
      violations,
      `Found ${violations.length} mutation routes without workflow imports:\n${violations.join("\n")}`
    ).toHaveLength(0)
  })
})
