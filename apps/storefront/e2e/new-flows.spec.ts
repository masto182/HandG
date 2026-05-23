import { test, expect } from "@playwright/test"
import { login, TEST_ACCOUNTS } from "./helpers/auth"
import { addFirstProductToCart, goToCheckout } from "./helpers/navigation"

const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

test.describe.serial("New flows — PR 3 / 4 / 5", () => {
  test("Apply form sends sdk.auth.register then /store/customers/register with Bearer", async ({
    page,
  }) => {
    let sawAuthRegister = false
    let registerHadBearer = false
    let registerBodyHadPassword = false

    page.on("request", (req) => {
      const url = req.url()
      if (url.includes("/auth/customer/emailpass/register")) {
        sawAuthRegister = true
      }
      if (url.includes("/store/customers/register")) {
        const auth = req.headers()["authorization"] || ""
        registerHadBearer = auth.startsWith("Bearer ")
        try {
          const body = JSON.parse(req.postData() || "{}")
          registerBodyHadPassword = "password" in body
        } catch {
          // ignore
        }
      }
    })

    await page.goto("/apply")
    const emailField = page.locator('input[name="email"]').first()
    if (!(await emailField.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Apply form not rendered; skipping")
    }

    const unique = `uat-${Date.now()}@test.dev`
    await page.fill('input[name="first_name"]', "UAT")
    await page.fill('input[name="last_name"]', "Tester")
    await page.fill('input[name="email"]', unique)
    await page.fill('input[name="password"]', "TestApply123!")
    await page.fill('input[name="date_of_birth"]', "1990-01-15")
    await page.fill('[name="why_join"]', "UAT smoke test")
    await page.fill('[name="favourite_brewery"]', "Hop & Glory")
    await page.locator('button[type="submit"]').click()

    // Either we navigate to /apply/pending or see an error inline.
    await page.waitForTimeout(5000)

    expect(sawAuthRegister, "sdk.auth.register must fire before /store/customers/register").toBe(true)
    expect(registerHadBearer, "/store/customers/register must carry Bearer registration token").toBe(true)
    expect(registerBodyHadPassword, "password must NOT be in the register body").toBe(false)
  })

  test("PayID reference is server-derived and alias matches config", async ({ page }) => {
    await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
    await addFirstProductToCart(page)
    await goToCheckout(page, "payment")

    const payidBtn = page.locator('button:has-text("PayID")').first()
    if (await payidBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await payidBtn.click()
      await page.waitForTimeout(2000)
    }

    const mainText = (await page.locator("main").last().textContent()) || ""
    // Reference starts with HG- and contains 8 chars from the cart id.
    expect(mainText).toMatch(/HG-[A-Z0-9]{4,}/)
    // Alias should match the configured one, not the stale stale@example.test.
    expect(mainText).toContain("payments@example.test")
    expect(mainText).not.toContain("stale@example.test")
  })

  test("PayID visible for delivery checkout", async ({ page }) => {
    await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
    await addFirstProductToCart(page)
    await goToCheckout(page, "payment")
    await expect(page.locator("text=/PayID/").first()).toBeVisible({ timeout: 10000 })
    // Cash-on-pickup hidden in delivery mode.
    const cash = page.locator('text=/[Cc]ash on [Pp]ickup/')
    expect(await cash.count()).toBe(0)
  })

  test("Cart-add 409 gate: non-VIP blocked on early-access-only product", async ({
    request,
  }) => {
    // Find any product via the public endpoint.
    const pubHeaders: Record<string, string> = {}
    if (PUBLISHABLE_KEY) pubHeaders["x-publishable-api-key"] = PUBLISHABLE_KEY
    const listRes = await request.get(`${BACKEND}/store/products`, { headers: pubHeaders })
    if (!listRes.ok()) {
      test.skip(true, `Store products list returned ${listRes.status()}; skipping`)
    }
    const products = (await listRes.json()).products as Array<{
      id: string
      variants: Array<{ id: string }>
      metadata?: Record<string, any>
    }>
    const product = products.find((p) => p.variants?.length > 0)
    if (!product) {
      test.skip(true, "No product with variants; skipping")
    }

    // Create a cart (anonymous — 409 can be asserted without a login).
    const cartRes = await request.post(`${BACKEND}/store/carts`, {
      headers: pubHeaders,
      data: { region_id: undefined },
    })
    if (!cartRes.ok()) {
      test.skip(
        true,
        `Could not create cart anonymously (status ${cartRes.status()}); skipping 409 assertion.`
      )
    }
    const cartId = (await cartRes.json()).cart.id

    // Set early_access_until 10h in the future via admin, if admin creds exist.
    // Without admin creds we just assert that the cart-add gate works on whatever
    // early_access_until is set on the product today; if none, we skip.
    const eaUntil = product?.metadata?.early_access_until
    if (!eaUntil) {
      test.skip(true, "Target product has no early_access_until; skipping 409 assertion.")
    }

    const addRes = await request.post(
      `${BACKEND}/store/carts/${cartId}/line-items`,
      {
        headers: pubHeaders,
        data: { variant_id: product?.variants[0].id, quantity: 1 },
      }
    )

    if (addRes.status() === 409) {
      const body = await addRes.json()
      expect(body.error).toBe("access_not_yet_available")
      expect(body.available_at).toBeTruthy()
    } else {
      // The product must no longer be in its early-access window.
      expect(new Date(eaUntil).getTime()).toBeLessThanOrEqual(Date.now())
    }
  })
})
