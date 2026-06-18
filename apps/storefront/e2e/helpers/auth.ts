import { Page, expect } from "@playwright/test"

export const TEST_ACCOUNTS = {
  approved: {
    email: "approved@example.test",
    password: "TestApproved123!",
  },
  pending: {
    email: "pending@example.test",
    password: "TestPending123!",
  },
  vip: {
    email: "vip@example.test",
    password: "TestVip123!",
  },
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/account")
  await page.waitForURL(/\/account/)

  const emailInput = page.locator('input[name="email"]')
  const passwordInput = page.locator('input[name="password"]')

  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(email)
    await passwordInput.fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(2000)
  }
}

export async function logout(page: Page) {
  await page.goto("/account")
  await page.waitForLoadState("domcontentloaded")

  // The real logout control is the account-nav button (data-testid
  // "logout-button", label "Sign Out"). Target it by testid only — text
  // selectors also match a hidden mobile-variant button, which breaks the
  // visibility wait. Fall back to the profile page's button if needed.
  const logoutBtn = page
    .locator(
      '[data-testid="logout-button"], [data-testid="profile-logout-button"]',
    )
    .first()
  await expect(logoutBtn).toBeVisible({ timeout: 10000 })
  await logoutBtn.click()
  // Wait for the session to actually clear: nav returns to Sign In / Apply.
  await expect(
    page.locator("text=Sign In").or(page.locator("text=Apply")).first(),
  ).toBeVisible({ timeout: 10000 })
}

export async function expectLoggedIn(page: Page) {
  await page.goto("/")
  await page.waitForTimeout(1000)
  const nav = page.locator("nav, header")
  await expect(nav.locator("text=Account").first()).toBeVisible({
    timeout: 5000,
  })
}

export async function expectLoggedOut(page: Page) {
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
  const either = page
    .locator("text=Sign In")
    .or(page.locator("text=Apply"))
    .first()
  await expect(either).toBeVisible({ timeout: 5000 })
}
