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
  await page.waitForTimeout(1000)

  const logoutBtn = page.locator('text=Log out').first()
  if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await logoutBtn.click()
    await page.waitForTimeout(2000)
  } else {
    const logoutLink = page.locator('a[href*="logout"], button:has-text("Logout"), button:has-text("Sign out")')
    if (await logoutLink.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutLink.first().click()
      await page.waitForTimeout(2000)
    }
  }
}

export async function expectLoggedIn(page: Page) {
  await page.goto("/")
  await page.waitForTimeout(1000)
  const nav = page.locator("nav, header")
  await expect(nav.locator('text=Account').first()).toBeVisible({ timeout: 5000 })
}

export async function expectLoggedOut(page: Page) {
  await page.goto("/")
  await page.waitForTimeout(1000)
  const applyLink = page.locator('text=Apply').first()
  const signInLink = page.locator('text=Sign In').first()
  const either = applyLink.or(signInLink)
  await expect(either).toBeVisible({ timeout: 5000 })
}
