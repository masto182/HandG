import { test, expect } from "@playwright/test"
import {
  apply,
  login,
  gotoProductByHandle,
  addCurrentProductToCart,
  checkoutDeliveryPayid,
} from "./helpers/customer-ui"
import {
  deleteCustomerByEmail,
  approveCustomerByEmail,
} from "./helpers/admin-api"

/**
 * Delivery checkout smoke.
 *
 * @smoke
 *
 * Covers the shipping path that the pickup-based smoke tests skip:
 *   - step-shipping rate selection (persistRate -> setShippingMethod, the H9
 *     concurrent-click race fix) including the signature-on-delivery toggle,
 *   - delivery place-order, and
 *   - the cart cookie being cleared after the order is placed (C3 — the
 *     `await removeCartId()` fix).
 */

const ts = Date.now()
const TEST_EMAIL = `e2e-delivery-${ts}@hg-test.dev`
const TEST_PASSWORD = "Delivery123!"
const PRODUCT_HANDLE = "e2e-test-pale-ale"

test.describe("Delivery checkout @smoke", () => {
  test.afterAll(async () => {
    await deleteCustomerByEmail(TEST_EMAIL).catch(() => {})
  })

  test("PDP -> add to cart -> delivery + shipping rate -> PayID -> order placed, cart cleared", async ({
    browser,
  }) => {
    // 1. Apply (throwaway context) + approve via API
    const applyCtx = await browser.newContext()
    const applyPage = await applyCtx.newPage()
    await apply(applyPage, { email: TEST_EMAIL, password: TEST_PASSWORD })
    await applyCtx.close()
    await approveCustomerByEmail(TEST_EMAIL)

    // 2. Login as the approved member
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await login(page, TEST_EMAIL, TEST_PASSWORD)

    // 3. PDP -> add to cart
    await gotoProductByHandle(page, PRODUCT_HANDLE)
    await addCurrentProductToCart(page)

    // 4. Delivery checkout, selecting a shipping rate + signature toggle
    await checkoutDeliveryPayid(page, { toggleSignature: true })

    // 5. Landed on the order confirmation page
    await expect(page).toHaveURL(/\/order\/.*\/confirmed/, { timeout: 30_000 })

    // 6. C3: the cart cookie must be cleared after the order is placed
    const cookies = await ctx.cookies()
    const cartCookie = cookies.find((c) => c.name === "_medusa_cart_id")
    expect(!cartCookie || cartCookie.value === "").toBe(true)

    await ctx.close()
  })
})
