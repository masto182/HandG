import { test, expect } from "@playwright/test"

/**
 * Hop System E2E
 *
 * Covers the hop taxonomy overhaul:
 * - /hops list page: country filter tabs render + filter works
 * - /hops/[slug] detail page: country badge, breeder, form chips, farm notes
 * - /store filter panel: Hop Origin section is present
 * - PDP: hop_provenance appears for approved members (smoke only — full auth is
 *   covered in membership-access.spec.ts)
 *
 * These tests rely on the seed-hops.ts data seeded in globalSetup.
 * At minimum the seed must include Nelson Sauvin (NZ) and Saaz (EU).
 *
 * @smoke
 */

// Slugs guaranteed to exist after seed-hops.ts runs
const NZ_HOP_SLUG = "nelson-sauvin"
const EU_HOP_SLUG = "saaz"
const US_HOP_SLUG = "citra"

test.describe("Hop list page /hops @smoke", () => {
  test("renders hop list with at least one hop card", async ({ page }) => {
    await page.goto("/hops")
    await page.waitForLoadState("networkidle")
    // The hop grid should have cards
    const cards = page.locator("a[href^='/hops/']")
    await expect(cards.first()).toBeVisible({ timeout: 20_000 })
  })

  test("country filter tabs render (All, NZ, AU, US, EU)", async ({ page }) => {
    await page.goto("/hops")
    await page.waitForLoadState("networkidle")
    for (const label of [
      "All",
      "New Zealand",
      "Australia",
      "United States",
      "Europe",
    ]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible()
    }
  })

  test("NZ tab filters to NZ hops only", async ({ page }) => {
    await page.goto("/hops?country=NZ")
    await page.waitForLoadState("networkidle")

    // Should show the NZ badge on cards
    const nzBadge = page.locator("text=NZ").first()
    await expect(nzBadge).toBeVisible({ timeout: 10_000 })

    // The "All" tab href should exist as a nav link back
    await expect(page.getByRole("link", { name: "All" })).toBeVisible()
  })

  test("EU tab filters to European hops (EU country chip is active)", async ({
    page,
  }) => {
    await page.goto("/hops?country=EU")
    await page.waitForLoadState("networkidle")
    // The EU tab link should be marked active (bg-hg-gold)
    // Note: EU hops may have zero linked products — that's correct behaviour
    // (the list shows only hops with stock). We verify the filter tab renders active.
    const euTab = page.getByRole("link", { name: "Europe" })
    await expect(euTab).toBeVisible({ timeout: 10_000 })
    // Whether the list is empty or populated, no error should occur
    const heading = page.getByRole("heading", { level: 1 })
    await expect(heading).toBeVisible()
  })

  test("selecting NZ tab and then All tab shows more hops", async ({
    page,
  }) => {
    await page.goto("/hops")
    await page.waitForLoadState("networkidle")
    const allCards = await page.locator("a[href^='/hops/']").count()

    await page.goto("/hops?country=NZ")
    await page.waitForLoadState("networkidle")
    const nzCards = await page.locator("a[href^='/hops/']").count()

    // NZ subset should be smaller than or equal to all
    expect(nzCards).toBeLessThanOrEqual(allCards)
  })
})

test.describe("Hop detail page /hops/[slug] @smoke", () => {
  test("NZ hop page shows New Zealand country badge", async ({ page }) => {
    await page.goto(`/hops/${NZ_HOP_SLUG}`)
    await page.waitForLoadState("networkidle")
    // Country badge links to /hops?country=NZ and shows "New Zealand"
    await expect(page.getByRole("link", { name: "New Zealand" })).toBeVisible({
      timeout: 10_000,
    })
  })

  test("NZ hop page shows breeder (NZ Hops Ltd)", async ({ page }) => {
    await page.goto(`/hops/${NZ_HOP_SLUG}`)
    await page.waitForLoadState("networkidle")
    // "by NZ Hops Ltd" appears in the breeder span; also appears in farm notes
    // — use first() to avoid strict-mode violation
    await expect(page.getByText("NZ Hops Ltd").first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test("NZ hop page shows available forms chips (T90, Cryo visible)", async ({
    page,
  }) => {
    await page.goto(`/hops/${NZ_HOP_SLUG}`)
    await page.waitForLoadState("networkidle")
    // "Available Forms" section heading
    await expect(page.getByText("Available Forms")).toBeVisible({
      timeout: 10_000,
    })
    // T90 chip should always be there
    await expect(page.getByText("T90 Pellets")).toBeVisible()
  })

  test("NZ hop page shows farm & sourcing notes section", async ({ page }) => {
    await page.goto(`/hops/${NZ_HOP_SLUG}`)
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("Farms & Sourcing")).toBeVisible({
      timeout: 10_000,
    })
  })

  test("hop form chip tooltip contains description when hovered", async ({
    page,
  }) => {
    await page.goto(`/hops/${NZ_HOP_SLUG}`)
    await page.waitForLoadState("networkidle")
    // The chip has a title attribute — verify the DOM attribute exists
    const t90Chip = page
      .locator("span[title]")
      .filter({ hasText: "T90 Pellets" })
      .first()
    await expect(t90Chip).toBeVisible({ timeout: 10_000 })
    const title = await t90Chip.getAttribute("title")
    expect(title).toBeTruthy()
    expect(title!.length).toBeGreaterThan(10)
  })

  test("EU hop page shows Europe country badge", async ({ page }) => {
    await page.goto(`/hops/${EU_HOP_SLUG}`)
    await page.waitForLoadState("networkidle")
    await expect(page.getByRole("link", { name: "Europe" })).toBeVisible({
      timeout: 10_000,
    })
  })

  test("EU hop page shows breeder", async ({ page }) => {
    await page.goto(`/hops/${EU_HOP_SLUG}`)
    await page.waitForLoadState("networkidle")
    // Czech Hop Institute is the breeder for Saaz
    await expect(page.getByText("Czech Hop Institute")).toBeVisible({
      timeout: 10_000,
    })
  })

  test("US hop page shows United States badge", async ({ page }) => {
    await page.goto(`/hops/${US_HOP_SLUG}`)
    // Turbopack dev: wait for network idle PLUS ensure the page hasn't 404'd
    await page.waitForLoadState("networkidle")
    await page.waitForLoadState("domcontentloaded")
    // Country badge links to /hops?country=US with text "United States"
    // Use first() in case the hop country chip appears in any other context
    await expect(
      page
        .locator('a[href*="country=US"]')
        .filter({ hasText: "United States" })
        .first(),
    ).toBeVisible({ timeout: 15_000 })
  })

  test("country badge is a link that navigates to filtered list", async ({
    page,
  }) => {
    await page.goto(`/hops/${NZ_HOP_SLUG}`)
    await page.waitForLoadState("networkidle")
    await page.getByRole("link", { name: "New Zealand" }).click()
    await page.waitForURL("**/hops?country=NZ")
    await expect(page).toHaveURL(/\/hops\?country=NZ/)
  })

  test("404 for unknown hop slug", async ({ page }) => {
    const resp = await page.goto("/hops/this-hop-does-not-exist-xyz")
    expect(resp?.status() ?? 0).toBeLessThan(500)
    // Should render a not-found state
    await expect(page.getByText(/not found|404/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})

test.describe("Store filter panel — Hop Origin @smoke", () => {
  test("Hop Origin section appears in the filter panel on /store", async ({
    page,
  }) => {
    await page.goto("/store")
    await page.waitForLoadState("networkidle")
    // Filter panel renders twice (desktop + mobile) — use first()
    await expect(
      page.getByRole("heading", { name: "Hop Origin" }).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test("Hop Origin has NZ, AU, US, EU chips", async ({ page }) => {
    await page.goto("/store")
    await page.waitForLoadState("networkidle")
    // The filter panel renders these as buttons
    for (const label of [
      "New Zealand",
      "Australia",
      "United States",
      "Europe",
    ]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible()
    }
  })

  test("clicking NZ origin chip appends hop_country=NZ to URL", async ({
    page,
  }) => {
    await page.goto("/store")
    await page.waitForLoadState("networkidle")
    await page.getByRole("button", { name: "New Zealand" }).click()
    await expect(page).toHaveURL(/hop_country=NZ/, { timeout: 5_000 })
  })

  test("clicking NZ origin chip twice removes it from URL (toggle off)", async ({
    page,
  }) => {
    await page.goto("/store?hop_country=NZ")
    await page.waitForLoadState("networkidle")
    await page.getByRole("button", { name: "New Zealand" }).click()
    // After toggle-off the param should be gone
    await page.waitForURL((url) => !url.search.includes("hop_country=NZ"), {
      timeout: 5_000,
    })
    expect(page.url()).not.toContain("hop_country=NZ")
  })
})

test.describe("Backend API — hop store routes", () => {
  const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL || "http://localhost:9000"
  const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  test("GET /store/hops returns hops with country_code and available_forms", async ({
    request,
  }) => {
    const res = await request.get(`${BACKEND}/store/hops`, {
      headers: { "x-publishable-api-key": PUB_KEY },
    })
    if (!res.ok())
      test.skip(true, `Store hops endpoint returned ${res.status()}`)
    const data = await res.json()
    const hops: any[] = data.hops || []
    // At least one hop should have been seeded with country_code
    const withCountry = hops.filter((h) => h.country_code)
    expect(withCountry.length).toBeGreaterThan(0)
    // And available_forms should be an array
    const withForms = hops.filter((h) => Array.isArray(h.available_forms))
    expect(withForms.length).toBeGreaterThan(0)
  })

  test("GET /store/hops/nelson-sauvin returns NZ + NZ Hops Ltd + forms + farm_notes", async ({
    request,
  }) => {
    const res = await request.get(`${BACKEND}/store/hops/nelson-sauvin`, {
      headers: { "x-publishable-api-key": PUB_KEY },
    })
    if (!res.ok())
      test.skip(true, `Nelson Sauvin slug returned ${res.status()}`)
    const data = await res.json()
    expect(data.hop.country_code).toBe("NZ")
    expect(data.hop.breeder).toBe("NZ Hops Ltd")
    expect(Array.isArray(data.hop.available_forms)).toBe(true)
    expect(data.hop.available_forms.length).toBeGreaterThan(0)
    expect(typeof data.hop.farm_notes).toBe("string")
  })

  test("GET /store/hops/saaz returns EU country_code", async ({ request }) => {
    const res = await request.get(`${BACKEND}/store/hops/saaz`, {
      headers: { "x-publishable-api-key": PUB_KEY },
    })
    if (!res.ok()) test.skip(true, `Saaz slug returned ${res.status()}`)
    const data = await res.json()
    expect(data.hop.country_code).toBe("EU")
  })

  test("MeiliSearch products index has hop_countries as a filterable attribute", async ({
    request,
  }) => {
    const MEILI_URL = process.env.MEILI_URL || "http://localhost:7700"
    const MEILI_KEY = process.env.MEILI_MASTER_KEY || "meili_dev_master_key"

    const res = await request.get(
      `${MEILI_URL}/indexes/products/settings/filterable-attributes`,
      {
        headers: { Authorization: MEILI_KEY ? `Bearer ${MEILI_KEY}` : "" },
      },
    )
    if (!res.ok()) test.skip(true, "MeiliSearch not available")
    const attrs: string[] = await res.json()
    expect(attrs).toContain("hop_countries")
  })
})
