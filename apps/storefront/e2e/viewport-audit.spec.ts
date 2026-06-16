import { test, expect } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const EVIDENCE_DIR =
  process.env.VIEWPORT_EVIDENCE_DIR ||
  path.join(process.cwd(), "docs/qa/evidence/viewport")

const PAGES = [
  { path: "/", name: "homepage" },
  { path: "/store", name: "store" },
  { path: "/products/e2e-test-pale-ale", name: "pdp" },
  { path: "/breweries", name: "breweries" },
  { path: "/apply", name: "apply" },
]

const findings: any[] = []

for (const vp of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test.describe(`Viewport ${vp.name} (${vp.width}x${vp.height})`, () => {
    for (const pg of PAGES) {
      test(`${pg.name} at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })

        const errors: string[] = []
        page.on("console", (msg) => {
          if (msg.type() === "error") errors.push(msg.text().slice(0, 120))
        })
        page.on("pageerror", (err) =>
          errors.push("PAGEERROR: " + err.message.slice(0, 120)),
        )

        await page.goto(pg.path, { waitUntil: "domcontentloaded" })
        await page.waitForTimeout(1500)

        const innerWidth = await page.evaluate(() => window.innerWidth)

        const mobileNavCount = await page
          .locator("nav.fixed, .mobile-bottom-nav, [data-mobile-nav]")
          .count()

        const navText = await page
          .locator("header")
          .first()
          .innerText()
          .catch(() => "no-header")
        const navLabels = navText.replace(/\s+/g, " ").trim().slice(0, 80)

        const cartLinks = page.locator("a[href='/cart']")
        const cartCount = await cartLinks.count()

        fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
        await page.screenshot({
          path: `${EVIDENCE_DIR}/${vp.name}-${pg.name}.png`,
        })

        const row = {
          viewport: `${vp.name} (${vp.width}px)`,
          page: pg.path,
          innerWidth,
          mobileNavCount,
          cartLinkCount: cartCount,
          navLabels: navLabels.slice(0, 60),
          consoleErrors: errors.length,
          firstError: errors[0]?.slice(0, 80) ?? "",
        }
        findings.push(row)

        console.log(JSON.stringify(row))

        expect(innerWidth).toBeGreaterThanOrEqual(vp.width - 20)
      })
    }
  })
}

test.afterAll(async () => {
  const p = `${EVIDENCE_DIR}/viewport-audit-report.json`
  fs.writeFileSync(p, JSON.stringify(findings, null, 2))
  console.log(`Report: ${p}`)
})
