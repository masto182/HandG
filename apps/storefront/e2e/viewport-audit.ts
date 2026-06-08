import { chromium } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const BASEURL = "http://localhost:8000"
const EVIDENCE_DIR =
  "/Users/cmasterson/projects/HandG/docs/qa/evidence/viewport"
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
]
const PAGES = [
  { path: "/", name: "homepage" },
  { path: "/store", name: "store" },
  { path: "/products/e2e-test-pale-ale", name: "pdp" },
  { path: "/breweries", name: "breweries" },
  { path: "/apply", name: "apply" },
]

type FindingRow = {
  viewport: string
  page: string
  innerWidth: number
  consoleErrors: string[]
  navLabels: string
  mobileNavVisible: boolean | string
  cartTabVisible: boolean | string
  notes: string
}

async function run() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const findings: FindingRow[] = []

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`)
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    })
    const page = await context.newPage()

    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text().slice(0, 120))
    })
    page.on("pageerror", (err) =>
      errors.push("PAGEERROR: " + err.message.slice(0, 120)),
    )

    for (const pg of PAGES) {
      errors.length = 0
      try {
        await page.goto(BASEURL + pg.path, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        })
        await page.waitForTimeout(2000)

        const innerWidth = await page.evaluate(() => window.innerWidth)

        // Detect mobile bottom nav (fixed bottom bar)
        const mobileNavVisible = await page.evaluate(() => {
          const el = document.querySelector(
            "[data-testid='mobile-bottom-nav'], nav.fixed.bottom-0, .mobile-bottom-nav",
          )
          if (!el) return "not-found"
          const s = window.getComputedStyle(el)
          return s.display !== "none" && s.visibility !== "hidden"
        })

        // Get nav label text
        const navLabels = await page.evaluate(() => {
          const nav = document.querySelector(
            "header nav, header [role='navigation']",
          )
          if (!nav) return "no-nav"
          return (
            nav.textContent?.replace(/\s+/g, " ").trim().slice(0, 100) ??
            "empty"
          )
        })

        // Check if cart tab visible
        const cartTabVisible = await page.evaluate(() => {
          const cartLinks = Array.from(
            document.querySelectorAll(
              "a[href='/cart'], button[aria-label*='cart' i], [data-testid='cart']",
            ),
          )
          return cartLinks.some((el) => {
            const s = window.getComputedStyle(el)
            return (
              s.display !== "none" &&
              s.visibility !== "hidden" &&
              (el as HTMLElement).offsetParent !== null
            )
          })
        })

        const screenshotPath = path.join(
          EVIDENCE_DIR,
          `${vp.name}-${pg.name}.png`,
        )
        await page.screenshot({ path: screenshotPath, fullPage: false })

        const row: FindingRow = {
          viewport: `${vp.name} (${innerWidth}px)`,
          page: pg.path,
          innerWidth,
          consoleErrors: [...errors],
          navLabels,
          mobileNavVisible,
          cartTabVisible,
          notes: "",
        }
        findings.push(row)
        console.log(
          `  ${pg.path}: innerWidth=${innerWidth}, mobileNav=${mobileNavVisible}, cart=${cartTabVisible}, errors=${errors.length}`,
        )
        if (errors.length) console.log("   Errors:", errors.slice(0, 2))
      } catch (e: any) {
        findings.push({
          viewport: vp.name,
          page: pg.path,
          innerWidth: -1,
          consoleErrors: ["NAVIGATION_ERROR: " + e.message.slice(0, 80)],
          navLabels: "error",
          mobileNavVisible: "error",
          cartTabVisible: "error",
          notes: "navigation failed",
        })
        console.log(`  ${pg.path}: NAVIGATION ERROR: ${e.message.slice(0, 60)}`)
      }
    }

    await context.close()
  }

  await browser.close()

  // Write JSON report
  const reportPath = path.join(EVIDENCE_DIR, "viewport-audit-report.json")
  fs.writeFileSync(reportPath, JSON.stringify(findings, null, 2))

  // Print summary table
  console.log("\n\n=== VIEWPORT AUDIT SUMMARY ===")
  console.log(
    "viewport".padEnd(22),
    "page".padEnd(22),
    "innerW",
    "mobileNav".padEnd(10),
    "cart".padEnd(6),
    "errors",
  )
  for (const f of findings) {
    console.log(
      f.viewport.padEnd(22),
      f.page.padEnd(22),
      String(f.innerWidth).padEnd(6),
      String(f.mobileNavVisible).padEnd(10),
      String(f.cartTabVisible).padEnd(6),
      f.consoleErrors.length > 0 ? f.consoleErrors.length + "x" : "0",
    )
  }
  console.log(`\nReport written to ${reportPath}`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
