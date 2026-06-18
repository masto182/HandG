import { test, expect } from "@playwright/test"

const PAGES = ["/", "/store", "/breweries", "/apply", "/faq"]

// Production builds emit hydration failures as *minified* React errors (#418
// text-content mismatch, #421/#422/#423 hydration errors, #425 text mismatch)
// rather than the verbose dev-only warnings. Match both so this is meaningful
// against the production build CI runs.
const MINIFIED_HYDRATION = /Minified React error #(418|421|422|423|425)/
function isHydrationMessage(text: string): boolean {
  return (
    text.includes("did not match") ||
    text.includes("Hydration failed") ||
    text.includes("hydrating") ||
    text.includes("server-rendered HTML") ||
    text.includes("Text content does not match") ||
    text.includes("Expected server HTML") ||
    MINIFIED_HYDRATION.test(text)
  )
}

test.describe("Hydration Hygiene — No React Mismatch Warnings", () => {
  for (const path of PAGES) {
    test(`No hydration mismatch on ${path}`, async ({ page }) => {
      const hydrationErrors: string[] = []

      page.on("console", (msg) => {
        const text = msg.text()
        if (isHydrationMessage(text)) {
          hydrationErrors.push(text.slice(0, 200))
        }
      })

      page.on("pageerror", (err) => {
        if (isHydrationMessage(err.message)) {
          hydrationErrors.push(err.message.slice(0, 200))
        }
      })

      await page.goto(path)
      await page.waitForLoadState("domcontentloaded")
      await page.waitForTimeout(2000)

      expect(
        hydrationErrors,
        `Hydration errors on ${path}:\n${hydrationErrors.join("\n")}`,
      ).toHaveLength(0)
    })
  }
})
