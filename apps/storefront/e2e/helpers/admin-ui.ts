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
  await page.waitForLoadState("domcontentloaded")

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
  await page.waitForLoadState("domcontentloaded")

  // The customer's "pending" group assignment is committed by a workflow step
  // that may lag the registration response. Retry search+reload until the row
  // appears (group assignment is durable) rather than relying on a single wait.
  const row = page.locator(`tr:has-text("${email}")`).first()
  let rowVisible = false
  for (let attempt = 0; attempt < 5; attempt++) {
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
      await page.waitForTimeout(3_000) // allow API round-trip to re-render table
    } else {
      await page.waitForTimeout(2_000) // no search box; wait for initial load
    }

    if (await row.isVisible({ timeout: 3_000 }).catch(() => false)) {
      rowVisible = true
      break
    }
    // Not yet — reload and try again (group assignment may still be committing).
    await page.goto(adminUrl("/app/members"))
    await page.waitForLoadState("domcontentloaded")
  }

  // Click the row to open the member detail drawer.
  await expect(row).toBeVisible({ timeout: 15_000 })
  await row.click()

  // The Approve button is in the drawer footer (not the row itself).
  // The drawer "Approve" button opens a confirmation prompt; it does NOT
  // approve on its own. Click it, then confirm in the alert dialog (whose
  // confirm action is also labelled "Approve"). Without the second click the
  // member stays in the "pending" group.
  const approveBtn = page
    .locator("button")
    .filter({ hasText: /^Approve$/ })
    .last()
  await expect(approveBtn).toBeVisible({ timeout: 8_000 })
  await approveBtn.click()

  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toBeVisible({ timeout: 8_000 })
  const confirmBtn = dialog.getByRole("button", { name: /^Approve$/ })
  await expect(confirmBtn).toBeVisible({ timeout: 8_000 })
  await confirmBtn.click()
  // Wait for the confirmation dialog to close (approval committed).
  await expect(dialog).toBeHidden({ timeout: 15_000 })
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
  await page.waitForLoadState("domcontentloaded")

  // The buy-at-price table loads its rows via a client-side fetch, so the row
  // for this customer appears a moment after the document loads. Wait for it
  // explicitly (auto-retrying) instead of counting immediately — otherwise we
  // race the data load and see zero rows.
  const rows = page.locator(`tr:has-text("${customerEmail}")`)
  await expect(rows.first()).toBeVisible({ timeout: 15_000 })
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

  // Approval is a two-step flow: "Review & approve N" opens a confirmation
  // dialog, and "Approve all" inside it actually POSTs the approval. Clicking
  // only the first "Approve" button just opens the dialog without confirming.
  await page.locator('button:has-text("Review & approve")').first().click()
  const approveAll = page.locator('button:has-text("Approve all")')
  await expect(approveAll).toBeVisible({ timeout: 10_000 })
  await approveAll.click()
  // Wait for the approval POST to settle (the dialog closes on success).
  await expect(approveAll).toBeHidden({ timeout: 15_000 })
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
  await page.waitForLoadState("domcontentloaded")
  // Open the first row in the orders table.
  const firstRow = page
    .locator('table tbody tr, [role="row"]:not(:has-text("Customer"))')
    .first()
  await expect(firstRow).toBeVisible({ timeout: 10_000 })
  await firstRow.click()
  await page.waitForLoadState("domcontentloaded")

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
  await page.waitForLoadState("domcontentloaded")

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
  await page.waitForLoadState("domcontentloaded")
  const row = await findMemberRowOnTierTabs(page, email)
  if (!row) return NaN
  const cells = row.locator("td")
  // Layout on non-pending tab: Name | Email | Tier | VIP Score | Referred by | Joined
  const scoreCell = (await cells.nth(3).textContent())?.trim() ?? ""
  // The cell is currency-formatted (e.g. "$1,040.00"); strip everything but
  // digits and the decimal point so the thousands comma doesn't truncate it.
  const cleaned = scoreCell.replace(/[^0-9.]/g, "")
  return cleaned ? parseFloat(cleaned) : NaN
}

export async function readMemberTier(
  page: Page,
  email: string,
): Promise<string> {
  await page.goto(adminUrl("/app/members"))
  await page.waitForLoadState("domcontentloaded")
  const row = await findMemberRowOnTierTabs(page, email)
  if (!row) return ""
  const cells = row.locator("td")
  // Layout on non-pending tab: Name | Email | Tier | VIP Score | Referred by | Joined
  return (await cells.nth(2).textContent())?.trim() ?? ""
}

/**
 * Find a member's row on a tier-bearing tab. Approved members live on the
 * "Approved" tab and VIP members on the "VIP" tab — there is no "All" tab — so
 * tier/score only render on those two. Search each in turn and return the first
 * matching row (or null).
 */
async function findMemberRowOnTierTabs(page: Page, email: string) {
  for (const tabName of ["Approved", "VIP"]) {
    const tab = page.locator(`button:has-text("${tabName}")`).first()
    if (await tab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await tab.click()
      await page.waitForTimeout(500)
    }
    const search = page.locator('input[placeholder*="name or email"]').first()
    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill(email)
      await search.press("Enter")
      await page.waitForTimeout(1_000)
    }
    const row = page.locator(`tr:has-text("${email}")`).first()
    if (await row.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return row
    }
  }
  return null
}
