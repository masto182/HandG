import { test, expect, Page } from "@playwright/test"
import {
  apply,
  login,
  gotoProductByHandle,
  addCurrentProductToCart,
  checkoutPickupPayid,
} from "./helpers/customer-ui"
import {
  adminLogin,
  captureFirstAwaitingPayment,
  readMemberTier,
  readMemberVipScore,
} from "./helpers/admin-ui"
import {
  deleteCustomerByEmail,
  approveCustomerByEmail,
} from "./helpers/admin-api"
import { pollVipScore } from "./helpers/vip"

/**
 * VIP tier walk: from approved → vip5 in five purchases.
 *
 * Tier thresholds (3-month rolling window): 100 / 250 / 450 / 700 / 1000
 *
 * To minimise inventory pressure and clock time we use the $80 stout, adjusting
 * quantity to clear the next threshold by exactly 1 unit:
 *   1 × 80   = 80   (still approved)
 *   3 × 80   = 240  → cumulative 320 → vip2
 *   2 × 80   = 160  → cumulative 480 → vip3
 *   3 × 80   = 240  → cumulative 720 → vip4
 *   4 × 80   = 320  → cumulative 1040 → vip5  ← important: NO manual approval
 *
 * VIP5 is intentionally automatic — see workflows/steps/evaluate-vip-progression.ts.
 */

const ts = Date.now()
const TEST_EMAIL = `e2e-tier-walk-${ts}@hg-test.dev`
const TEST_PASSWORD = "TierWalk123!"
const STOUT_HANDLE = "e2e-test-buy-now-stout" // $80
const UNIT_PRICE = 80

const STEPS: Array<{ qty: number; expectedTier: string; minScore: number }> = [
  { qty: 1, expectedTier: "approved", minScore: 80 },
  { qty: 3, expectedTier: "vip2", minScore: 320 },
  { qty: 2, expectedTier: "vip3", minScore: 480 },
  { qty: 3, expectedTier: "vip4", minScore: 720 },
  { qty: 4, expectedTier: "vip5", minScore: 1040 },
]

async function setQuantityOnProductPage(
  page: Page,
  qty: number,
): Promise<void> {
  // The product page has a quantity selector; use the explicit input if it
  // exists, otherwise click the +/- buttons until the value matches.
  const input = page
    .locator('input[name="quantity"], input[type="number"]')
    .first()
  if (await input.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await input.fill(String(qty))
    return
  }
  const plus = page
    .locator('button[aria-label="Increase quantity"], button:has-text("+")')
    .first()
  for (let i = 1; i < qty; i++) {
    if (await plus.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await plus.click()
      await page.waitForTimeout(150)
    }
  }
}

test.describe("VIP tier progression — full walk", () => {
  // This is intentionally long-running; we relax the per-test timeout
  // because 5 purchase+capture loops sit on async subscriber polls.
  test.slow()
  test.setTimeout(15 * 60_000)

  test.afterAll(async () => {
    await deleteCustomerByEmail(TEST_EMAIL).catch(() => {})
  })

  test("walk approved → vip5 over 5 purchases (vip5 auto, no manual approval)", async ({
    browser,
  }) => {
    const aCtx = await browser.newContext()
    const aPage = await aCtx.newPage()

    const applyCtx = await browser.newContext()
    const applyPage = await applyCtx.newPage()
    await apply(applyPage, { email: TEST_EMAIL, password: TEST_PASSWORD })
    await applyCtx.close()

    await approveCustomerByEmail(TEST_EMAIL)
    await adminLogin(aPage)

    const cCtx = await browser.newContext()
    const cPage = await cCtx.newPage()
    await login(cPage, TEST_EMAIL, TEST_PASSWORD)

    for (let i = 0; i < STEPS.length; i++) {
      const step = STEPS[i]
      await gotoProductByHandle(cPage, STOUT_HANDLE)
      await setQuantityOnProductPage(cPage, step.qty)
      await addCurrentProductToCart(cPage)
      const { orderRef } = await checkoutPickupPayid(cPage)
      expect(orderRef, `purchase ${i + 1} got an order reference`).toMatch(
        /^HG-/,
      )
      await captureFirstAwaitingPayment(aPage)

      const score = await pollVipScore(cPage, step.minScore, 90_000)
      expect(score, `score after step ${i + 1}`).toBeGreaterThanOrEqual(
        step.minScore,
      )

      const adminTier = await readMemberTier(aPage, TEST_EMAIL)
      expect(
        adminTier.toLowerCase(),
        `admin tier after step ${i + 1}`,
      ).toContain(step.expectedTier)
    }

    // Final cross-check: admin VIP score >= the highest threshold.
    const finalScore = await readMemberVipScore(aPage, TEST_EMAIL)
    expect(finalScore).toBeGreaterThanOrEqual(1000)

    await cCtx.close()
    await aCtx.close()
  })
})
