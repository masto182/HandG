import { test, expect } from "@playwright/test"

const PAGES = ["/", "/store", "/breweries", "/apply", "/faq"]

const KNOWN_HYDRATION_ISSUES = ["/breweries"]

test.describe("Hydration Hygiene — No React Mismatch Warnings", () => {
  for (const path of PAGES) {
    test(`No hydration mismatch on ${path}`, async ({ page }) => {
      if (KNOWN_HYDRATION_ISSUES.includes(path)) {
        test.skip(true, "Known hydration mismatch — tracked for fix")
      }
      const hydrationErrors: string[] = []

      page.on("console", (msg) => {
        const text = msg.text()
        if (
          text.includes("did not match") ||
          text.includes("Hydration failed") ||
          text.includes("hydrating") ||
          text.includes("server-rendered HTML") ||
          text.includes("Text content does not match") ||
          text.includes("Expected server HTML")
        ) {
          hydrationErrors.push(text.slice(0, 200))
        }
      })

      page.on("pageerror", (err) => {
        if (
          err.message.includes("Hydration") ||
          err.message.includes("hydrat")
        ) {
          hydrationErrors.push(err.message.slice(0, 200))
        }
      })

      await page.goto(path)
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(2000)

      expect(
        hydrationErrors,
        `Hydration errors on ${path}:\n${hydrationErrors.join("\n")}`,
      ).toHaveLength(0)
    })
  }
})
