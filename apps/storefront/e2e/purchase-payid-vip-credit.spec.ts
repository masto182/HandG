import { test, expect } from "@playwright/test"
import {
  apply,
  login,
  gotoProductByHandle,
  addCurrentProductToCart,
  checkoutPickupPayid,
  readVipScoreFromAccount,
} from "./helpers/customer-ui"
import {
  adminLogin,
  captureOrderPayment,
  readMemberVipScore,
} from "./helpers/admin-ui"
import {
  deleteCustomerByEmail,
  approveCustomerByEmail,
} from "./helpers/admin-api"
import { pollVipScore } from "./helpers/vip"

/**
 * @smoke
 *
 * Full happy path:
 *   1. Customer applies, admin approves.
 *   2. Customer logs in, adds the $50 pale ale, checks out via Pickup + PayID.
 *   3. Admin captures the PayID payment (manual two-step authorize/capture).
 *   4. VIP score reflects the captured order amount on both /account/membership
 *      (storefront) and /app/members (admin).
 */

const ts = Date.now()
const TEST_EMAIL = `e2e-pay-${ts}@hg-test.dev`
const TEST_PASSWORD = "PayTest123!"
const PRODUCT_HANDLE = "e2e-test-pale-ale"
const ORDER_VALUE = 50

test.describe("Purchase → PayID → VIP credit @smoke", () => {
  test.afterAll(async () => {
    await deleteCustomerByEmail(TEST_EMAIL).catch(() => {})
  })

  test("approved customer purchases, admin captures, VIP score credited", async ({
    browser,
  }) => {
    test.setTimeout(200_000) // apply+checkout+capture+60s poll exceeds the default 90s
    // 1. Apply in a throwaway context (registration sets a stale token)
    const applyCtx = await browser.newContext()
    const applyPage = await applyCtx.newPage()
    await apply(applyPage, { email: TEST_EMAIL, password: TEST_PASSWORD })
    await applyCtx.close()

    await approveCustomerByEmail(TEST_EMAIL)

    // 2. Customer logs in with fresh context after approval
    const cCtx = await browser.newContext()
    const cPage = await cCtx.newPage()
    await login(cPage, TEST_EMAIL, TEST_PASSWORD)

    const aCtx = await browser.newContext()
    const aPage = await aCtx.newPage()
    await adminLogin(aPage)
    await gotoProductByHandle(cPage, PRODUCT_HANDLE)
    await addCurrentProductToCart(cPage)
    const { orderRef, orderId } = await checkoutPickupPayid(cPage)
    expect(orderRef).toMatch(/^HG-/)

    // 3. Admin captures payment for the specific order (not first-in-list)
    await captureOrderPayment(aPage, orderId)

    // 4. Score is credited on both surfaces
    const score = await pollVipScore(cPage, ORDER_VALUE, 60_000)
    expect(score).toBeGreaterThanOrEqual(ORDER_VALUE)

    const adminScore = await readMemberVipScore(aPage, TEST_EMAIL)
    expect(adminScore).toBeGreaterThanOrEqual(ORDER_VALUE)

    await cCtx.close()
    await aCtx.close()
  })
})
