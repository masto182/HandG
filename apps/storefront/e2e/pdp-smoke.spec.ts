import { test, expect } from "@playwright/test"

/**
 * Product detail page smoke.
 *
 * @smoke
 *
 * Guards the H15 fix: the PDP null-guards a missing product BEFORE deriving
 * variant images, so an unknown handle returns a clean 404 (notFound()) instead
 * of crashing with a 500. A known handle must render without error.
 *
 * No login required — /products/* is not behind the auth middleware (only
 * /cart and /checkout are); price is gated separately for non-members.
 */

const VALID_HANDLE = "e2e-test-pale-ale"

test.describe("PDP rendering @smoke", () => {
  test("known product handle renders without crashing", async ({ page }) => {
    const resp = await page.goto(`/products/${VALID_HANDLE}`)
    expect(resp?.status() ?? 0).toBeLessThan(400)
    await expect(
      page.locator('h1, [data-testid="product-title"]').first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test("unknown product handle renders not-found, not a 500 crash (H15 null-guard)", async ({
    page,
  }) => {
    const resp = await page.goto(
      `/products/this-product-does-not-exist-${Date.now()}`,
    )
    // H15: the pre-fix code called getImagesForVariant() before the null check,
    // so a missing product threw a TypeError (HTTP 500). The fix null-guards
    // first and renders the not-found UI. We assert NO 5xx crash + the
    // not-found page is shown. (The app currently serves this as a soft 404 /
    // HTTP 200 rather than a true 404 — tracked separately as an SEO item.)
    expect(resp?.status() ?? 0).toBeLessThan(500)
    await expect(page.getByText(/page not found|404/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
