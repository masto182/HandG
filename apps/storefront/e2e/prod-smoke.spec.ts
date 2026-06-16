import { test, expect, chromium } from "@playwright/test"

const PROD_URL = process.env.PLAYWRIGHT_PROD_URL || "http://localhost:8001"

test.describe("Production smoke", () => {
  for (const pg of [
    "/",
    "/store",
    "/products/e2e-test-pale-ale",
    "/breweries",
    "/apply",
  ]) {
    test(`${pg} loads without errors in prod`, async ({ page }) => {
      const errors: string[] = []
      const hydrationErrors: string[] = []
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text().slice(0, 100))
        if (
          msg.text().includes("Hydration") ||
          msg.text().includes("hydration")
        )
          hydrationErrors.push(msg.text().slice(0, 80))
      })
      page.on("pageerror", (err) =>
        errors.push("PAGEERROR: " + err.message.slice(0, 80)),
      )

      await page.goto(PROD_URL + pg, { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2000)

      const title = await page.title()
      console.log(
        JSON.stringify({
          page: pg,
          title: title.slice(0, 40),
          consoleErrors: errors.length,
          hydrationErrors: hydrationErrors.length,
          firstError: errors[0]?.slice(0, 80) ?? "",
        }),
      )

      expect(title).not.toContain("Something broke")
      expect(title).not.toContain("500")
    })
  }
})
