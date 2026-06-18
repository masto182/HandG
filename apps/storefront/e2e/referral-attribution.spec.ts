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
 * Referral attribution:
 *   1. Referrer applies + admin approves.
 *   2. Referrer reads their referral code from /account/referrals.
 *   3. Referee applies via /apply?ref=<code>, admin approves.
 *   4. Referee buys $50 lager and admin captures payment.
 *   5. Referrer's VIP score reflects 0.2 × $50 (direct referral weight).
 */

const ts = Date.now()
const REFERRER_EMAIL = `e2e-ref-er-${ts}@hg-test.dev`
const REFEREE_EMAIL = `e2e-ref-ee-${ts}@hg-test.dev`
const PASSWORD = "RefTest123!"
const PRODUCT_HANDLE = "e2e-test-pickup-lager" // $50
const REFEREE_ORDER_VALUE = 50
const EXPECTED_REFERRER_DELTA = 0.2 * REFEREE_ORDER_VALUE // = 10

test.describe("Referral attribution @smoke", () => {
  test.afterAll(async () => {
    await deleteCustomerByEmail(REFEREE_EMAIL).catch(() => {})
    await deleteCustomerByEmail(REFERRER_EMAIL).catch(() => {})
  })

  test("referee purchase credits referrer at 0.2× weight", async ({
    browser,
  }) => {
    test.setTimeout(280_000) // two apply+approve cycles + checkout + capture + 90s poll
    const aCtx = await browser.newContext()
    const aPage = await aCtx.newPage()
    await adminLogin(aPage)

    // 1. Referrer applies + approve (fresh context for apply, fresh for login)
    const refApplyCtx = await browser.newContext()
    const refApplyPage = await refApplyCtx.newPage()
    await apply(refApplyPage, {
      email: REFERRER_EMAIL,
      password: PASSWORD,
      firstName: "Ref",
    })
    await refApplyCtx.close()
    // Use the authoritative referral code returned by the approve API rather
    // than scraping /account/referrals (which flakes under CI load while the
    // logged-in session's "approved" group membership propagates).
    const referralCode = await approveCustomerByEmail(REFERRER_EMAIL)
    expect(referralCode, "referrer must have a code").toBeTruthy()
    const refCtx = await browser.newContext()
    const refPage = await refCtx.newPage()
    await login(refPage, REFERRER_EMAIL, PASSWORD)
    const baselineScore = await readVipScoreFromAccount(refPage)

    // 2. Referee applies with referral code, admin approves
    const reeApplyCtx = await browser.newContext()
    const reeApplyPage = await reeApplyCtx.newPage()
    await apply(reeApplyPage, {
      email: REFEREE_EMAIL,
      password: PASSWORD,
      firstName: "Ree",
      referralCode,
    })
    await reeApplyCtx.close()
    await approveCustomerByEmail(REFEREE_EMAIL)

    // 3. Referee buys, admin captures (fresh context)
    const reeCtx = await browser.newContext()
    const reePage = await reeCtx.newPage()
    await login(reePage, REFEREE_EMAIL, PASSWORD)
    await gotoProductByHandle(reePage, PRODUCT_HANDLE)
    await addCurrentProductToCart(reePage)
    const { orderRef, orderId } = await checkoutPickupPayid(reePage)
    expect(orderRef).toMatch(/^HG-/)
    await captureOrderPayment(aPage, orderId)

    // 4. Referrer's score should pick up 0.2 × order value within poll window.
    const target =
      (Number.isFinite(baselineScore) ? baselineScore : 0) +
      EXPECTED_REFERRER_DELTA
    const finalScore = await pollVipScore(refPage, target, 90_000)
    expect(finalScore).toBeGreaterThanOrEqual(target)

    const adminScore = await readMemberVipScore(aPage, REFERRER_EMAIL)
    expect(adminScore).toBeGreaterThanOrEqual(target)

    await refCtx.close()
    await reeCtx.close()
    await aCtx.close()
  })
})
