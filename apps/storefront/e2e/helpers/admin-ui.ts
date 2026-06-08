import { Page, expect } from "@playwright/test"

/**
 * Admin UI helpers — strictly via /app (Medusa admin SPA).
 *
 * For the HG-functional admin flows (member approval, buy-at-price approval,
 * payment capture for VIP credit) we go through the UI exactly as a human
 * operator would, per the operator's "everything via UI" rule.
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@example.test"
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "ChangeMe123!"
const BACKEND_URL =
  process.env.PLAYWRIGHT_BACKEND_URL || "http://localhost:9000"

const adminUrl = (path: string) => `${BACKEND_URL}${path}`

export async function adminLogin(page: Page): Promise<void> {
  await page.goto(adminUrl("/app/login"))
  await page.waitForLoadState("networkidle")

  const emailField = page
    .locator('input[name="email"], input[type="email"]')
    .first()
  if (await emailField.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await emailField.fill(ADMIN_EMAIL)
    await page
      .locator('input[name="password"], input[type="password"]')
      .first()
      .fill(ADMIN_PASSWORD)
    await page.locator('button[type="submit"]').first().click()
    await page
      .waitForURL(/\/app(\/|$)(?!login)/, { timeout: 15_000 })
      .catch(() => {})
  }
}

/**
 * Approve a pending member via /app/members.
 * Clicks the row to open the member drawer, then clicks Approve in the footer.
 * The table rows have no inline Approve action — it lives in the slide-over drawer.
 */
export async function approveMember(page: Page, email: string): Promise<void> {
  await page.goto(adminUrl("/app/members"))
  await page.waitForLoadState("networkidle")

  // Pending tab is the default but click it to be sure.
  const pendingTab = page.locator('button:has-text("Pending")').first()
  if (await pendingTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await pendingTab.click()
    await page.waitForTimeout(500)
  }

  const search = page.locator('input[placeholder*="name or email"]').first()
  if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await search.fill(email)
    await search.press("Enter")
    await page.waitForTimeout(1_000)
  }

  // Click the row to open the member detail drawer.
  const row = page.locator(`tr:has-text("${email}")`).first()
  await expect(row).toBeVisible({ timeout: 10_000 })
  await row.click()

  // The Approve button is in the drawer footer (not the row itself).
  // The bulk-action bar renders "Approve N" so exact: true on "Approve" is safe.
  const approveBtn = page
    .locator("button")
    .filter({ hasText: /^Approve$/ })
    .last()
  await expect(approveBtn).toBeVisible({ timeout: 8_000 })
  await approveBtn.click()
  await page.waitForTimeout(2_000)
}

/**
 * Approve every pending buy-at-price offer for the given customer email.
 *
 * The /app/buy-at-price page lists rows with the customer's email and a
 * checkbox per row; clicking "Approve N selected" creates the promotion.
 */
export async function approveAllBuyAtPriceFor(
  page: Page,
  customerEmail: string,
): Promise<void> {
  await page.goto(adminUrl("/app/buy-at-price"))
  await page.waitForLoadState("networkidle")

  const rows = page.locator(`tr:has-text("${customerEmail}")`)
  const n = await rows.count()
  expect(n, `No buy-at-price rows found for ${customerEmail}`).toBeGreaterThan(
    0,
  )

  for (let i = 0; i < n; i++) {
    const checkbox = rows
      .nth(i)
      .locator('input[type="checkbox"], button[role="checkbox"]')
      .first()
    if (await checkbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await checkbox.click()
    }
  }

  await page.locator('button:has-text("Approve")').first().click()
  await page.waitForTimeout(2_500)
}

/**
 * Capture payment for the *most recent* draft/awaiting order in the system.
 *
 * Medusa's built-in admin orders list shows newest first; we open the first
 * order whose payment status is "awaiting" / "authorized" and click the
 * "Capture payment" button. This is the trigger for the order.payment_captured
 * subscriber that credits VIP score.
 */
export async function captureFirstAwaitingPayment(page: Page): Promise<void> {
  await page.goto(adminUrl("/app/orders"))
  await page.waitForLoadState("networkidle")
  // Open the first row in the orders table.
  const firstRow = page
    .locator('table tbody tr, [role="row"]:not(:has-text("Customer"))')
    .first()
  await expect(firstRow).toBeVisible({ timeout: 10_000 })
  await firstRow.click()
  await page.waitForLoadState("networkidle")

  // The capture button text varies across Medusa minor releases; try the
  // common variants.
  const captureBtn = page
    .locator(
      'button:has-text("Capture payment"), button:has-text("Capture Payment"), button:has-text("Mark as paid"), button:has-text("Capture")',
    )
    .first()
  await expect(captureBtn).toBeVisible({ timeout: 15_000 })
  await captureBtn.click()

  // Some flows show a confirmation modal — click "Confirm" if present.
  const confirm = page
    .locator('button:has-text("Confirm"), button:has-text("Yes")')
    .first()
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirm.click()
  }
  await page.waitForTimeout(2_500)
}

/**
 * Capture payment for a specific order by ID.
 * More reliable than captureFirstAwaitingPayment — goes directly to the order,
 * so concurrent test orders don't cause captures on the wrong row.
 */
export async function captureOrderPayment(
  page: Page,
  orderId: string,
): Promise<void> {
  if (!orderId) {
    // Fallback to first-awaiting if no order ID (e.g. order didn't confirm)
    return captureFirstAwaitingPayment(page)
  }
  await page.goto(adminUrl(`/app/orders/${orderId}`))
  await page.waitForLoadState("networkidle")

  const captureBtn = page
    .locator(
      'button:has-text("Capture payment"), button:has-text("Capture Payment"), button:has-text("Mark as paid"), button:has-text("Capture")',
    )
    .first()
  await expect(captureBtn).toBeVisible({ timeout: 15_000 })
  await captureBtn.click()

  const confirm = page
    .locator('button:has-text("Confirm"), button:has-text("Yes")')
    .first()
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirm.click()
  }
  await page.waitForTimeout(2_500)
}

/**
 * Read VIP score for an email from /app/members.
 * Returns NaN when the row hasn't loaded yet — caller polls.
 */
export async function readMemberVipScore(
  page: Page,
  email: string,
): Promise<number> {
  await page.goto(adminUrl("/app/members"))
  await page.waitForLoadState("networkidle")
  // Switch to "All" tab so the member is visible regardless of approval status.
  const allTab = page.locator('button:has-text("All")').first()
  if (await allTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await allTab.click()
    await page.waitForTimeout(500)
  }
  const search = page.locator('input[placeholder*="name or email"]').first()
  if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await search.fill(email)
    await search.press("Enter")
    await page.waitForTimeout(1_000)
  }
  const row = page.locator(`tr:has-text("${email}")`).first()
  if (!(await row.isVisible({ timeout: 5_000 }).catch(() => false))) return NaN
  const cells = row.locator("td")
  // Layout on non-pending tab: Name | Email | Tier | VIP Score | Referred by | Joined
  const scoreCell = (await cells.nth(3).textContent())?.trim() ?? ""
  const m = scoreCell.match(/[0-9.]+/)
  return m ? parseFloat(m[0]) : NaN
}

export async function readMemberTier(
  page: Page,
  email: string,
): Promise<string> {
  await page.goto(adminUrl("/app/members"))
  await page.waitForLoadState("networkidle")
  // Switch to "All" tab so the member is visible regardless of approval status.
  const allTab = page.locator('button:has-text("All")').first()
  if (await allTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await allTab.click()
    await page.waitForTimeout(500)
  }
  const search = page.locator('input[placeholder*="name or email"]').first()
  if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await search.fill(email)
    await search.press("Enter")
    await page.waitForTimeout(1_000)
  }
  const row = page.locator(`tr:has-text("${email}")`).first()
  if (!(await row.isVisible({ timeout: 5_000 }).catch(() => false))) return ""
  const cells = row.locator("td")
  // Layout on non-pending tab: Name | Email | Tier | VIP Score | Referred by | Joined
  return (await cells.nth(2).textContent())?.trim() ?? ""
}
