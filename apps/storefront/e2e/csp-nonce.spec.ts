import { test, expect } from "@playwright/test"

test.describe("CSP Nonce Verification", () => {
  test("Response includes Content-Security-Policy header with nonce and no unsafe-inline in script-src", async ({ page }) => {
    const response = await page.goto("/")
    expect(response).not.toBeNull()

    const csp = response!.headers()["content-security-policy"] || ""
    expect(csp).not.toBe("")
    expect(csp).toContain("nonce-")
    expect(csp).toContain("'strict-dynamic'")

    const scriptSrcMatch = csp.match(/script-src\s+([^;]+)/)
    expect(scriptSrcMatch).not.toBeNull()
    const scriptSrc = scriptSrcMatch![1]
    expect(scriptSrc).not.toContain("'unsafe-inline'")

    const nonceMatch = csp.match(/nonce-([A-Za-z0-9+/=]+)/)
    expect(nonceMatch).not.toBeNull()
    const headerNonce = nonceMatch![1]
    expect(headerNonce.length).toBeGreaterThan(10)
  })

  test("Page loads without CSP violations — scripts execute under strict-dynamic", async ({ page }) => {
    const cspViolations: string[] = []
    page.on("console", (msg) => {
      if (msg.text().includes("Content Security Policy") || msg.text().includes("CSP")) {
        cspViolations.push(msg.text())
      }
    })
    page.on("pageerror", (err) => {
      if (err.message.includes("Content Security Policy")) {
        cspViolations.push(err.message)
      }
    })

    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    expect(cspViolations).toHaveLength(0)
  })

  test("HTML source contains nonce attributes on script tags", async ({ request }) => {
    const response = await request.get("http://localhost:8000/")
    const html = await response.text()
    const cspHeader = response.headers()["content-security-policy"] || ""
    const nonceMatch = cspHeader.match(/nonce-([A-Za-z0-9+/=]+)/)

    expect(nonceMatch).not.toBeNull()
    const nonce = nonceMatch![1]

    const scriptTags = html.match(/<script[^>]*>/g) || []
    const inlineScripts = scriptTags.filter((tag) => !tag.includes("src="))

    for (const tag of inlineScripts) {
      if (tag.includes("dangerouslySetInnerHTML") || tag === "<script>") continue
      expect.soft(tag, `Script tag missing nonce: ${tag.slice(0, 80)}`).toContain(`nonce=`)
    }

    const scriptsWithNonce = scriptTags.filter((tag) => tag.includes(`nonce="${nonce}"`))
    expect(scriptsWithNonce.length).toBeGreaterThan(0)
  })

  test("Nonce is unique per request", async ({ request }) => {
    const response1 = await request.get("http://localhost:8000/")
    const csp1 = response1.headers()["content-security-policy"] || ""
    const nonce1 = csp1.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1]

    const response2 = await request.get("http://localhost:8000/")
    const csp2 = response2.headers()["content-security-policy"] || ""
    const nonce2 = csp2.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1]

    expect(nonce1).toBeDefined()
    expect(nonce2).toBeDefined()
    expect(nonce1).not.toBe(nonce2)
  })
})
