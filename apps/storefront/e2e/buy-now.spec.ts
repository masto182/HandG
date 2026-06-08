import { test, expect } from "@playwright/test"
import {
  apply,
  login,
  gotoProductByHandle,
  setBuyAtPrice,
  addCurrentProductToCart,
  checkoutPickupPayid,
} from "./helpers/customer-ui"
import {
  adminLogin,
  approveAllBuyAtPriceFor,
  captureFirstAwaitingPayment,
} from "./helpers/admin-ui"
import {
  deleteCustomerByEmail,
  deleteWishlistEntriesForCustomer,
  approveCustomerByEmail,
} from "./helpers/admin-api"

/**
 * Buy-now (buy-at-price) flow:
 *   1. Customer applies, admin approves.
 *   2. On the $80 stout product page, customer raises a buy-at-price offer at
 *      $60 via the wishlist mode selector.
 *   3. Admin approves the offer batch in /app/buy-at-price.
 *   4. Customer adds the stout to cart and observes the discounted line total.
 *   5. Customer checks out and admin captures payment as usual.
 */

const ts = Date.now()
const TEST_EMAIL = `e2e-buy-now-${ts}@hg-test.dev`
const TEST_PASSWORD = "BuyNow123!"
const STOUT_HANDLE = "e2e-test-buy-now-stout"
const OFFER_PRICE = 60

test.describe("Buy-at-price (Buy Now)", () => {
  test.afterAll(async () => {
    await deleteWishlistEntriesForCustomer(TEST_EMAIL).catch(() => {})
    await deleteCustomerByEmail(TEST_EMAIL).catch(() => {})
  })

  test("offer → admin approve → discounted purchase", async ({ browser }) => {
    // 1. Apply in throwaway context + approve via API
    const applyCtx = await browser.newContext()
    const applyPage = await applyCtx.newPage()
    await apply(applyPage, { email: TEST_EMAIL, password: TEST_PASSWORD })
    await applyCtx.close()

    await approveCustomerByEmail(TEST_EMAIL)

    // 2. Customer logs in with fresh context
    const cCtx = await browser.newContext()
    const cPage = await cCtx.newPage()
    await login(cPage, TEST_EMAIL, TEST_PASSWORD)

    const aCtx = await browser.newContext()
    const aPage = await aCtx.newPage()
    await adminLogin(aPage)
    await gotoProductByHandle(cPage, STOUT_HANDLE)
    await setBuyAtPrice(cPage, OFFER_PRICE)

    // 3. Admin approves the offer.
    await approveAllBuyAtPriceFor(aPage, TEST_EMAIL)

    // 4. Add to cart and verify the cart total shows the discount applied.
    await gotoProductByHandle(cPage, STOUT_HANDLE)
    await addCurrentProductToCart(cPage)
    await cPage.goto("/cart")
    await cPage.waitForLoadState("networkidle")
    const cartText = (await cPage.locator("main").last().textContent()) || ""
    // Either the subtotal shows $60.00 or there's a visible discount line for
    // $20 off — both prove the buy-at-price promotion is applied.
    expect(cartText).toMatch(/A?\$\s*60\.00|-A?\$\s*20\.00/)

    // 5. Checkout + capture (regression for the discounted-order capture path).
    const { orderRef } = await checkoutPickupPayid(cPage)
    expect(orderRef).toMatch(/^HG-/)
    await captureFirstAwaitingPayment(aPage)

    await cCtx.close()
    await aCtx.close()
  })
})
