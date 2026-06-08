import { test, expect } from "@playwright/test"
import { readFileSync } from "fs"
import { resolve } from "path"

function loadPublishableKey(): string {
  if (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY)
    return process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  try {
    const envLocal = readFileSync(resolve(__dirname, "../.env.local"), "utf-8")
    const match = envLocal.match(/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.+)/)
    return match?.[1]?.trim() || ""
  } catch {
    return ""
  }
}

const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = loadPublishableKey()

test.describe("Brewery slug page collabs section", () => {
  test("collab partner brewery shows the collab product in its page collabs", async ({
    page,
  }) => {
    // other-half-brewing is the collab partner on tree-house-x-other-half-tropic-thunder
    await page.goto("/breweries/other-half-brewing")

    await expect(page.locator("body")).toContainText("Other Half Brewing", {
      timeout: 10_000,
    })

    // The collab product should be referenced via its handle on the page
    const collabLink = page.locator(
      `a[href*="/products/tree-house-x-other-half-tropic-thunder"]`,
    )
    await expect(collabLink.first()).toBeVisible({ timeout: 15_000 })
  })

  test("primary brewery (tree-house-brewing) does NOT list the collab product as one of its collabs", async ({
    request,
  }) => {
    // The collab product's primary is Tree House, so on /breweries/tree-house-brewing
    // the COLLABS section (reverse-lookup of where TH is a partner) should NOT
    // include this product. It may still appear in the brewery's own primary releases.
    const collabsRes = await request.get(
      `${BACKEND}/store/breweries/tree-house-brewing/collabs`,
      { headers: { "x-publishable-api-key": PUBLISHABLE_KEY } },
    )
    expect(collabsRes.status()).toBe(200)
    const data = await collabsRes.json()
    const handles = (data.collabs || []).map((c: any) => c.handle)
    expect(handles).not.toContain("tree-house-x-other-half-tropic-thunder")
  })
})
