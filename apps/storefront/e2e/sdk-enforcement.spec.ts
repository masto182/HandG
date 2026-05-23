import { test, expect } from "@playwright/test"
import { execSync } from "child_process"
import path from "path"

const STOREFRONT_SRC = path.resolve(__dirname, "../src")

test.describe("SDK-Only Enforcement — No Raw fetch() to Medusa", () => {
  test("No raw fetch() calls to Medusa store/admin endpoints in storefront src", () => {
    const result = execSync(
      `grep -rn "fetch(" "${STOREFRONT_SRC}" --include="*.ts" --include="*.tsx" | ` +
      `grep -E "(/store/|/admin/|localhost:9000|MEDUSA_BACKEND)" | ` +
      `grep -v "sdk\\.client" | ` +
      `grep -v "sdk-exempt" | ` +
      `grep -v "node_modules" | ` +
      `grep -v ".spec.ts" | ` +
      `grep -v "e2e/" || true`,
      { encoding: "utf-8" }
    ).trim()

    const violations = result.split("\n").filter(Boolean)
    expect(
      violations,
      `Found ${violations.length} raw fetch() calls to Medusa endpoints (should use sdk.client.fetch):\n${violations.join("\n")}`
    ).toHaveLength(0)
  })
})
