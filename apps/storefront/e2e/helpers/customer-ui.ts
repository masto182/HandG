import { Page, expect } from "@playwright/test"

/**
 * Customer-facing UI helpers — registration, login, cart, wishlist, checkout,
 * VIP score reading. Strictly UI; no direct API calls. Used by every spec.
 */

export type ApplyInput = {
  email: string
  password: string
  firstName?: string
  lastName?: string
  whyJoin?: string
  favouriteBrewery?: string
  referralCode?: string
  dateOfBirth?: string
}

export async function apply(page: Page, i: ApplyInput): Promise<void> {
  const url = i.referralCode
    ? `/apply?ref=${encodeURIComponent(i.referralCode)}`
    : "/apply"
  await page.goto(url)
  await page.waitForLoadState("domcontentloaded")
  await page.fill('input[name="first_name"]', i.firstName ?? "E2E")
  await page.fill('input[name="last_name"]', i.lastName ?? "Tester")
  await page.fill('input[name="email"]', i.email)
  await page.fill('input[name="password"]', i.password)
  await page.fill('input[name="confirm_password"]', i.password)
  await page.fill('input[name="date_of_birth"]', i.dateOfBirth ?? "1990-01-15")
  await page.fill(
    'input[name="why_join"], [name="why_join"]',
    i.whyJoin ?? "Playwright E2E run",
  )
  await page.fill(
    'input[name="favourite_brewery"], [name="favourite_brewery"]',
    i.favouriteBrewery ?? "Hops & Glory",
  )
  if (i.referralCode) {
    await page
      .fill('input[name="referral_code"]', i.referralCode)
      .catch(() => {})
  }
  await page.locator('button[type="submit"]').click()
  await page
    .waitForURL(/\/apply\/(pending|rejected)|\/account/, { timeout: 15_000 })
    .catch(() => {})
}

export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/account")
  await page.waitForLoadState("domcontentloaded")
  const emailInput = page.locator('input[name="email"]').first()
  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill(email)
    await page.locator('input[name="password"]').first().fill(password)
    await page.locator('button[type="submit"]').first().click()
    // Wait for the post-login redirect before proceeding; CI is slower than
    // local dev and networkidle + 1500ms can resolve before the redirect fires.
    await page
      .waitForURL(/\/account(?!.*login)/, { timeout: 30_000 })
      .catch(() => {})
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(1500)
  }
}

export async function logout(page: Page): Promise<void> {
  await page.goto("/account")
  await page.waitForLoadState("domcontentloaded")
  const logoutBtn = page
    .locator(
      'button:has-text("Log out"), button:has-text("Logout"), button:has-text("Sign out")',
    )
    .first()
  if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await logoutBtn.click()
    await page.waitForLoadState("domcontentloaded")
  }
}

export async function gotoProductByHandle(
  page: Page,
  handle: string,
): Promise<void> {
  await page.goto(`/products/${handle}`, { waitUntil: "domcontentloaded" })
  // Do NOT wait for "networkidle" — a storefront page has settling background
  // requests that rarely reach 500ms of true idle, so it can burn the whole
  // test timeout. The visibility assertion below is the real readiness gate.
  await expect(
    page.locator('h1, [data-testid="product-title"]').first(),
  ).toBeVisible({ timeout: 15_000 })
}

export async function addCurrentProductToCart(page: Page): Promise<void> {
  const addBtn = page
    .locator('button:has-text("Add to cart"), button:has-text("Add to Cart")')
    .first()
  await expect(addBtn).toBeVisible({ timeout: 10_000 })
  await addBtn.click()
  // Wait for cart count or drawer to update
  await page.waitForTimeout(2_500)
}

/**
 * Set a buy-at-price wishlist offer on the currently-displayed product page.
 * Opens the mode selector, picks "Buy at Price", enters the target, and saves.
 */
export async function setBuyAtPrice(
  page: Page,
  targetPrice: number,
): Promise<void> {
  // The wishlist management panel has an "Alert me at Price" checkbox
  const priceCheckbox = page
    .locator(
      'label:has-text("Alert me at Price"), label:has-text("Target Price")',
    )
    .first()
  await expect(priceCheckbox).toBeVisible({ timeout: 10_000 })

  // The wishlist panel hydrates its toggle state asynchronously from the saved
  // wishlist item (a useEffect keyed on the loaded item). That hydration can
  // reset the price-alert toggle a moment after we click it, so a single click
  // + fixed wait is racy. Retry the toggle until the price input is stably
  // visible.
  const priceInput = page
    .locator('input[type="number"][step="0.01"], input[inputmode="decimal"]')
    .first()
  await expect(async () => {
    if (!(await priceInput.isVisible())) {
      await priceCheckbox.click()
    }
    await expect(priceInput).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 15_000 })
  await priceInput.fill(targetPrice.toFixed(2))

  // Click the "SET" button next to the price input
  const setBtn = page.locator('button:has-text("SET")').first()
  await expect(setBtn).toBeVisible({ timeout: 5_000 })
  await setBtn.click()
  await page.waitForTimeout(1_500)
}

/**
 * Run the standard Pickup → PayID checkout.
 *
 * Assumes there is at least one item in the cart and that the user is logged
 * in. After this returns, the order has been placed and is awaiting admin
 * payment capture.
 */
export async function checkoutPickupPayid(
  page: Page,
): Promise<{ orderRef: string; orderId: string }> {
  await page.goto("/checkout?step=fulfilment")
  await page.waitForLoadState("domcontentloaded")

  // Select In-Store Pickup card (label wraps the radio — click label directly)
  const pickupLabel = page.locator('label:has-text("In-Store Pickup")').first()
  await expect(pickupLabel).toBeVisible({ timeout: 10_000 })
  await pickupLabel.click()
  await page.waitForTimeout(500)

  // Continue through checkout steps
  const continueBtn = page.locator('button:has-text("Continue")').first()
  await expect(continueBtn).toBeVisible({ timeout: 5_000 })
  await continueBtn.click()
  await page.waitForTimeout(2_000)

  // If we land on address step, continue through it
  if (page.url().includes("step=address")) {
    const nextBtn = page.locator('button:has-text("Continue")').first()
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.click()
      await page.waitForTimeout(2_000)
    }
  }

  // Wait for payment step
  await page.waitForURL(/step=payment/, { timeout: 15_000 })
  await page.waitForLoadState("domcontentloaded")

  // When multiple payment methods exist, the card selector is shown and PayID
  // must be clicked explicitly (pickup orders never auto-select a method).
  const payidCard = page.locator('button:has-text("PayID Transfer")').first()
  if (await payidCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await payidCard.click()
    await page.waitForTimeout(600)
  }

  await expect(
    page
      .locator('h3:has-text("PayID Payment Details"), h2:has-text("PayID")')
      .first(),
  ).toBeVisible({ timeout: 10_000 })

  const refLocator = page.locator("main").last()
  const ref = (await refLocator.textContent()) || ""
  const refMatch = ref.match(/HG-[A-Z0-9]+/)
  const orderRef = refMatch?.[0] ?? ""

  // Accept payment terms (button is enabled after a payment method is selected)
  const payTermsBtn = page
    .locator('button:has-text("I Understand"), button:has-text("Continue")')
    .first()
  await expect(payTermsBtn).toBeEnabled({ timeout: 8_000 })
  await payTermsBtn.click()

  // Wait explicitly for the review step (router.push is async — don't sleep then check URL).
  await page.waitForURL(/step=review|order.*confirmed/, { timeout: 20_000 })
  if (page.url().includes("step=review")) {
    const placeOrderBtn = page.locator('button:has-text("Place Order")').first()
    await expect(placeOrderBtn).toBeVisible({ timeout: 5_000 })
    await placeOrderBtn.click()
    await page
      .waitForURL(/\/order\/.*\/confirmed/, { timeout: 30_000 })
      .catch(() => {})
  }

  // Extract order ID from the confirmed URL if we landed there.
  const confirmedMatch = page.url().match(/\/order\/([^/]+)\/confirmed/)
  const orderId = confirmedMatch?.[1] ?? ""

  return { orderRef, orderId }
}

/**
 * Run a Delivery -> shipping-rate -> PayID checkout. This is the path that
 * exercises step-shipping rate selection (persistRate -> setShippingMethod,
 * the H9 race fix) and the delivery place-order/cart-clear path (C3) — the
 * pickup checkout bypasses both. Assumes >=1 item in cart and a logged-in,
 * approved member. ShipEngine falls back to its deterministic stub when no API
 * key is set, so rates are present and stable in CI.
 */
/**
 * Walk the delivery checkout flow up to (and stopping at) the payment step,
 * WITHOUT placing an order. Used to assert payment-step UI (e.g. PayID) for the
 * delivery path. Jumping straight to ?step=payment is redirected back to
 * fulfilment by the checkout guard when no shipping method is set.
 */
export async function gotoDeliveryPaymentStep(page: Page): Promise<void> {
  await page.goto("/checkout?step=fulfilment")
  await page.waitForLoadState("domcontentloaded")

  const deliveryLabel = page.locator('label:has-text("Home Delivery")').first()
  await expect(deliveryLabel).toBeVisible({ timeout: 10_000 })
  await deliveryLabel.click()
  await page.waitForTimeout(500)
  await page.locator('button:has-text("Continue")').first().click()

  await page.waitForURL(/step=address/, { timeout: 15_000 })
  await page.fill('input[name="shipping_address.first_name"]', "Delivery")
  await page.fill('input[name="shipping_address.last_name"]', "Tester")
  await page.fill('input[name="shipping_address.address_1"]', "1 Test Street")
  await page.keyboard.press("Escape")
  await page.fill('input[name="shipping_address.city"]', "Melbourne")
  await page.fill('input[name="shipping_address.province"]', "VIC")
  await page.fill('input[name="shipping_address.postal_code"]', "3000")
  const emailField = page.locator('input[name="email"]')
  if (await emailField.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const cur = await emailField.inputValue().catch(() => "")
    if (!cur) await emailField.fill("delivery-tester@hg-test.dev")
  }
  await page
    .locator(
      'button:has-text("Continue to Shipping Method"), button:has-text("Continue")',
    )
    .first()
    .click()

  await page.waitForURL(/step=shipping/, { timeout: 15_000 })
  const firstRate = page.locator('input[name="shipping"]').first()
  await expect(firstRate).toBeVisible({ timeout: 15_000 })
  await firstRate.check({ force: true })
  await page.waitForTimeout(2_500) // persistRate -> setShippingMethod round-trip

  await page.locator('button:has-text("Proceed to Payment")').first().click()
  await page.waitForURL(/step=payment/, { timeout: 15_000 })
  await page.waitForLoadState("domcontentloaded")
}

export async function checkoutDeliveryPayid(
  page: Page,
  opts?: { toggleSignature?: boolean },
): Promise<{ orderRef: string; orderId: string }> {
  await page.goto("/checkout?step=fulfilment")
  await page.waitForLoadState("domcontentloaded")

  // 1. Choose Home Delivery
  const deliveryLabel = page.locator('label:has-text("Home Delivery")').first()
  await expect(deliveryLabel).toBeVisible({ timeout: 10_000 })
  await deliveryLabel.click()
  await page.waitForTimeout(500)
  await page.locator('button:has-text("Continue")').first().click()

  // 2. Address step — fill a valid AU shipping address
  await page.waitForURL(/step=address/, { timeout: 15_000 })
  await page.fill('input[name="shipping_address.first_name"]', "Delivery")
  await page.fill('input[name="shipping_address.last_name"]', "Tester")
  await page.fill('input[name="shipping_address.address_1"]', "1 Test Street")
  await page.keyboard.press("Escape") // dismiss any AU address autocomplete dropdown
  await page.fill('input[name="shipping_address.city"]', "Melbourne")
  await page.fill('input[name="shipping_address.province"]', "VIC")
  await page.fill('input[name="shipping_address.postal_code"]', "3000")
  const emailField = page.locator('input[name="email"]')
  if (await emailField.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const cur = await emailField.inputValue().catch(() => "")
    if (!cur) await emailField.fill("delivery-tester@hg-test.dev")
  }
  await page
    .locator(
      'button:has-text("Continue to Shipping Method"), button:has-text("Continue")',
    )
    .first()
    .click()

  // 3. Shipping step — select a live (stub-backed) rate; this drives persistRate
  await page.waitForURL(/step=shipping/, { timeout: 15_000 })
  const firstRate = page.locator('input[name="shipping"]').first()
  await expect(firstRate).toBeVisible({ timeout: 15_000 })
  await firstRate.check({ force: true })
  await page.waitForTimeout(2_500) // persistRate -> setShippingMethod round-trip

  if (opts?.toggleSignature) {
    // Best-effort signature-on-delivery toggle (exercises the SoD sibling rate).
    const sigToggle = page
      .locator('button:has-text("Signature"), [aria-label*="signature" i]')
      .first()
    if (await sigToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sigToggle.click()
      await page.waitForTimeout(2_500)
    }
  }

  await page.locator('button:has-text("Proceed to Payment")').first().click()

  // 4. Payment step (PayID) -> place order
  await page.waitForURL(/step=payment/, { timeout: 15_000 })
  await page.waitForLoadState("domcontentloaded")

  // Delivery checkout: PayID is the only visible method for non-pickup carts,
  // so it auto-selects when filteredMethods.length === 1. But click it anyway
  // in case the card selector is rendered.
  const payidCardDelivery = page
    .locator('button:has-text("PayID Transfer")')
    .first()
  if (
    await payidCardDelivery.isVisible({ timeout: 3_000 }).catch(() => false)
  ) {
    await payidCardDelivery.click()
    await page.waitForTimeout(600)
  }

  await expect(
    page
      .locator('h3:has-text("PayID Payment Details"), h2:has-text("PayID")')
      .first(),
  ).toBeVisible({ timeout: 10_000 })
  const ref = (await page.locator("main").last().textContent()) || ""
  const orderRef = ref.match(/HG-[A-Z0-9]+/)?.[0] ?? ""

  const payTermsBtn = page
    .locator('button:has-text("I Understand"), button:has-text("Continue")')
    .first()
  await expect(payTermsBtn).toBeEnabled({ timeout: 8_000 })
  await payTermsBtn.click()

  // Wait explicitly for the review step before clicking Place Order.
  await page.waitForURL(/step=review|order.*confirmed/, { timeout: 20_000 })
  if (page.url().includes("step=review")) {
    const placeOrderBtn = page.locator('button:has-text("Place Order")').first()
    await expect(placeOrderBtn).toBeVisible({ timeout: 5_000 })
    await placeOrderBtn.click()
  }
  await page.waitForURL(/\/order\/.*\/confirmed/, { timeout: 30_000 })

  const confirmedMatchDelivery = page.url().match(/\/order\/([^/]+)\/confirmed/)
  const orderId = confirmedMatchDelivery?.[1] ?? ""

  return { orderRef, orderId }
}

/**
 * Read VIP score from the storefront /account/vip server-rendered page.
 * That page uses getAuthHeaders() so it's immune to client-side session 401s.
 * Returns NaN if not visible — caller decides whether to retry/poll.
 */
export async function readVipScoreFromAccount(page: Page): Promise<number> {
  await page.goto("/account/vip")
  await page.waitForLoadState("domcontentloaded")
  const text = (await page.locator("main, body").first().textContent()) || ""
  // The VIP page renders "Current score: X" — regex matches any "score" pattern.
  const m = text.match(
    /(?:Current\s+score|VIP\s*Score|Score)[:\s-]*([0-9]+(?:\.[0-9]+)?)/i,
  )
  return m ? parseFloat(m[1]) : NaN
}
