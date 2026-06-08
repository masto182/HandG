import { test, expect } from "@playwright/test"
import { apply, login } from "./helpers/customer-ui"
import { adminLogin, approveMember, readMemberTier } from "./helpers/admin-ui"
import { deleteCustomerByEmail } from "./helpers/admin-api"

/**
 * @smoke
 *
 * 1. Customer applies via /apply.
 * 2. Admin approves them via /app/members.
 * 3. Customer logs in and sees the approved-member account dashboard.
 *
 * Cleanup: delete the test customer via the admin REST API.
 */

const ts = Date.now()
const TEST_EMAIL = `e2e-reg-${ts}@hg-test.dev`
const TEST_PASSWORD = "RegTest123!"

test.describe("Registration & approval @smoke", () => {
  test.afterAll(async () => {
    await deleteCustomerByEmail(TEST_EMAIL).catch(() => {})
  })

  test("apply → admin approve → login as approved member", async ({
    browser,
  }) => {
    // 1. Customer applies (anonymous browser context)
    const customerCtx = await browser.newContext()
    const customerPage = await customerCtx.newPage()
    await apply(customerPage, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      firstName: "RegSmoke",
      lastName: "Tester",
    })
    // Either /apply/pending or a soft success state.
    await expect(customerPage).toHaveURL(/\/apply\/pending|\/account/, {
      timeout: 15_000,
    })
    await customerCtx.close()

    // 2. Admin approves (separate browser context to avoid auth bleed-through)
    const adminCtx = await browser.newContext()
    const adminPage = await adminCtx.newPage()
    await adminLogin(adminPage)
    await approveMember(adminPage, TEST_EMAIL)
    const tier = await readMemberTier(adminPage, TEST_EMAIL)
    expect(tier.toLowerCase()).toMatch(/approved|vip/)
    await adminCtx.close()

    // 3. Customer logs in — should reach /account dashboard, not /apply/pending.
    const loggedCtx = await browser.newContext()
    const loggedPage = await loggedCtx.newPage()
    await login(loggedPage, TEST_EMAIL, TEST_PASSWORD)
    await loggedPage.goto("/account")
    await loggedPage.waitForLoadState("networkidle")
    await expect(loggedPage).not.toHaveURL(/\/apply/, { timeout: 5_000 })
    await loggedCtx.close()
  })
})
