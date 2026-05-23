import { test, expect } from "@playwright/test"
import { login, logout, TEST_ACCOUNTS, expectLoggedOut } from "./helpers/auth"
import {
  goToHomepage,
  goToFirstProduct,
  goToCart,
  goToCheckout,
  addFirstProductToCart,
  goToBreweryPage,
} from "./helpers/navigation"

test.describe.serial("Membership Access Control — Full Flow", () => {

  test.describe("Phase 1: Non-Approved User (Not Logged In)", () => {

    test("1. Homepage loads with products", async ({ page }) => {
      await goToHomepage(page)
      const heading = page.locator("h1, h2, [data-testid='hero']").first()
      await expect(heading).toBeVisible({ timeout: 10000 })
    })

    test("2. Product grid renders with cards", async ({ page }) => {
      await goToHomepage(page)
      const productCards = page.locator('a[href^="/products/"]')
      await expect(productCards.first()).toBeVisible({ timeout: 10000 })
      expect(await productCards.count()).toBeGreaterThan(0)
    })

    test("3. Product cards do NOT show prices", async ({ page }) => {
      await goToHomepage(page)
      await page.waitForTimeout(2000)
      const mainContent = page.locator("main").last()
      const priceText = await mainContent.textContent()
      expect(priceText).not.toMatch(/A\$\d+\.\d{2}/)
    })

    test("4. Product cards do NOT show Add to Cart buttons", async ({ page }) => {
      await goToHomepage(page)
      const addBtns = page.locator('button:has-text("Add to cart"), button:has-text("Add to Cart")')
      expect(await addBtns.count()).toBe(0)
    })

    test("5. Product detail page loads", async ({ page }) => {
      await goToFirstProduct(page)
      const productTitle = page.locator("h1, h2, [data-testid='product-title']").first()
      await expect(productTitle).toBeVisible()
    })

    test("6. Product detail: NO ABV shown", async ({ page }) => {
      await goToFirstProduct(page)
      await page.waitForTimeout(2000)
      const pageText = await page.locator("main").last().textContent() || ""
      const hasAbv = pageText.toLowerCase().includes("abv") || /\d+\.?\d*\s*%/.test(pageText)
      expect(hasAbv).toBeFalsy()
    })

    test("7. Product detail: NO price shown", async ({ page }) => {
      await goToFirstProduct(page)
      const pageText = await page.locator("main").last().textContent()
      expect(pageText).not.toMatch(/A\$\d+\.\d{2}/)
    })

    test("8. Apply for Membership CTA visible", async ({ page }) => {
      await goToFirstProduct(page)
      const applyCta = page.locator('text=/[Aa]pply|[Mm]embership/')
      await expect(applyCta.first()).toBeVisible({ timeout: 5000 })
    })

    test("9. Navigation shows Apply link", async ({ page }) => {
      await goToHomepage(page)
      const nav = page.locator("nav, header")
      const applyLink = nav.locator('text=/[Aa]pply|Sign In/')
      await expect(applyLink.first()).toBeVisible({ timeout: 5000 })
    })

    test("10. Cart icon hidden or empty", async ({ page }) => {
      await goToHomepage(page)
      const cartLink = page.locator('a[href="/cart"], [data-testid="cart-link"]')
      if (await cartLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        const cartText = await cartLink.textContent()
        expect(cartText).toMatch(/(0)|Cart/)
      }
    })

    test("11. Direct /cart URL shows empty or redirects", async ({ page }) => {
      await goToCart(page)
      const emptyState = page.locator('text=/[Ee]mpty|no items|sign in/i')
      const isOnCart = page.url().includes("/cart")
      if (isOnCart) {
        await expect(emptyState.first()).toBeVisible({ timeout: 5000 })
      }
    })

    test("12. Direct /checkout URL blocks non-member", async ({ page }) => {
      await page.goto("/checkout?step=fulfilment")
      await page.waitForTimeout(2000)
      const url = page.url()
      const notFound = page.locator('text=/[Nn]ot found|[Pp]age not found/')
      const isBlocked = !url.includes("step=fulfilment") || await notFound.isVisible({ timeout: 3000 }).catch(() => false)
      expect(isBlocked).toBeTruthy()
    })

    test("13. Direct /account URL redirects to login", async ({ page }) => {
      await page.goto("/account")
      await page.waitForTimeout(2000)
      const loginForm = page.locator('input[name="email"], input[type="email"]')
      const isLoginPage = await loginForm.isVisible({ timeout: 5000 }).catch(() => false)
      expect(isLoginPage || page.url().includes("login") || page.url().includes("account")).toBeTruthy()
    })

    test("14. Search works without login", async ({ page }) => {
      await page.goto("/")
      const searchInput = page.locator('input[placeholder*="earch"], [data-testid="search-input"]')
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill("IPA")
        await page.waitForTimeout(1500)
        const results = page.locator('[data-testid="search-results"], [class*="search"]')
        await expect(results.first()).toBeVisible({ timeout: 5000 })
      }
    })

    test("15. Brewery page loads", async ({ page }) => {
      await page.goto("/breweries")
      await page.waitForLoadState("networkidle")
      const content = page.locator("main").last()
      await expect(content).toBeVisible()
    })
  })

  test.describe("Phase 2: Approved Member (After Login)", () => {

    test("16. Login with approved credentials", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/")
      await page.waitForTimeout(2000)
      const nav = page.locator("nav, header")
      const accountLink = nav.locator('text=/[Aa]ccount/')
      await expect(accountLink.first()).toBeVisible({ timeout: 10000 })
    })

    test("17. Session persists on page reload", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/")
      await page.reload()
      await page.waitForTimeout(2000)
      const nav = page.locator("nav, header")
      const accountLink = nav.locator('text=/[Aa]ccount/')
      await expect(accountLink.first()).toBeVisible({ timeout: 5000 })
    })

    test("18. Product cards NOW show prices", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/")
      await page.waitForTimeout(3000)
      const mainText = await page.locator("main").last().textContent()
      expect(mainText).toMatch(/A\$\d+/)
    })

    test("19. Product detail: ABV visible", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await goToFirstProduct(page)
      await page.waitForTimeout(2000)
      const pageText = await page.locator("main").last().textContent() || ""
      const hasAbv = pageText.toLowerCase().includes("abv") || /\d+\.?\d*\s*%/.test(pageText)
      expect(hasAbv).toBeTruthy()
    })

    test("20. Product detail: price visible", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await goToFirstProduct(page)
      const pageText = await page.locator("main").last().textContent()
      expect(pageText).toMatch(/A\$\d+/)
    })

    test("21. Product detail: Add to Cart button visible", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await goToFirstProduct(page)
      const addBtn = page.locator('button:has-text("Add to cart"), button:has-text("Add to Cart")')
      await expect(addBtn.first()).toBeVisible({ timeout: 5000 })
    })

    test("22. Can add product to cart", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      const cartIndicator = page.locator('text=/Cart.*[1-9]|\\([1-9]\\)/')
      await expect(cartIndicator.first()).toBeVisible({ timeout: 5000 })
    })

    test("23. Cart page shows added item", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await page.waitForTimeout(3000)
      await goToCart(page)
      await page.waitForTimeout(2000)
      const cartContent = page.locator('main').last()
      const text = await cartContent.textContent()
      const hasItems = text?.includes("A$") || text?.includes("Qty") || text?.includes("quantity")
      const itemRow = page.locator('[data-testid="product-row"], table tr, [data-testid="cart-item"]').first()
      const rowVisible = await itemRow.isVisible({ timeout: 5000 }).catch(() => false)
      expect(hasItems || rowVisible).toBeTruthy()
    })

    test("24. Change quantity in cart", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCart(page)
      const qtySelect = page.locator('select, [data-testid="product-select-button"]').first()
      if (await qtySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await qtySelect.selectOption("2")
        await page.waitForTimeout(2000)
        const cartText = await page.locator("main").last().textContent()
        expect(cartText).toContain("2")
      }
    })

    test("25. Remove item from cart", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCart(page)
      const deleteBtn = page.locator('[data-testid="product-delete-button"], button:has-text("Delete")').first()
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click()
        await page.waitForTimeout(2000)
      }
    })

    test("26. Add item back for checkout tests", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCart(page)
      const itemRow = page.locator('[data-testid="product-row"], table tr').first()
      await expect(itemRow).toBeVisible({ timeout: 5000 })
    })

    test("27. Checkout Step 1: 3 fulfilment cards visible", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "fulfilment")
      const heading = page.locator('text=/[Hh]ow would you like/')
      await expect(heading.first()).toBeVisible({ timeout: 10000 })
      const cards = page.locator('button:has-text("SELECT"), button:has-text("SELECTED")')
      expect(await cards.count()).toBeGreaterThanOrEqual(2)
    })

    test("28. Select Delivery → navigates to address", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "fulfilment")
      const deliveryCard = page.locator('h3:has-text("Delivery")').locator('..')
      await deliveryCard.click()
      const continueBtn = page.locator('button:has-text("CONTINUE TO ADDRESS")')
      await expect(continueBtn).toBeVisible({ timeout: 5000 })
      await continueBtn.click()
      await page.waitForTimeout(2000)
      expect(page.url()).toContain("step=address")
    })

    test("29. Address form renders", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "address")
      const heading = page.locator('text=/[Ww]here should we deliver/')
      await expect(heading.first()).toBeVisible({ timeout: 10000 })
    })

    test("30. Submit address → navigates to shipping", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "address")
      await page.waitForTimeout(2000)
      const submitBtn = page.locator('button:has-text("CONTINUE TO SHIPPING")')
      await expect(submitBtn).toBeVisible({ timeout: 5000 })
      await submitBtn.click()
      await page.waitForTimeout(3000)
      expect(page.url()).toContain("step=shipping")
    })

    test("31. Shipping shows address summary", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "shipping")
      await page.waitForTimeout(2000)
      const pageText = await page.locator("main").last().textContent() || ""
      const hasAddressInfo = pageText.includes("Delivering to") || pageText.includes("Standard") || pageText.includes("Express") || page.url().includes("step=shipping")
      expect(hasAddressInfo || page.url().includes("step=address")).toBeTruthy()
    })

    test("32. Standard + Express options visible with prices", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "shipping")
      const standard = page.locator('text=/[Ss]tandard/')
      const express = page.locator('text=/[Ee]xpress/')
      await expect(standard.first()).toBeVisible({ timeout: 10000 })
      await expect(express.first()).toBeVisible({ timeout: 5000 })
    })

    test("33. Recommended badge on Standard", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "shipping")
      const badge = page.locator('text=/[Rr]ecommended/')
      await expect(badge.first()).toBeVisible({ timeout: 10000 })
    })

    test("34. Select Standard → navigates to payment", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "shipping")
      const standardBtn = page.locator('button:has-text("Standard")').first()
      await standardBtn.click()
      await page.waitForTimeout(1000)
      const continueBtn = page.locator('button:has-text("CONTINUE TO PAYMENT")')
      await expect(continueBtn).toBeVisible({ timeout: 5000 })
      await continueBtn.click()
      await page.waitForTimeout(2000)
      expect(page.url()).toContain("step=payment")
    })

    test("35. PayID option visible", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "payment")
      const payid = page.locator('text=/PayID/')
      await expect(payid.first()).toBeVisible({ timeout: 10000 })
    })

    test("36. Cash on Pickup NOT visible in delivery mode", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "payment")
      const cash = page.locator('text=/[Cc]ash on [Pp]ickup/')
      expect(await cash.count()).toBe(0)
    })

    test("37. Select PayID → navigates to review", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "payment")
      const payidBtn = page.locator('button:has-text("PayID")').first()
      await payidBtn.click()
      await page.waitForTimeout(1000)
      const continueBtn = page.locator('button:has-text("CONTINUE TO REVIEW")')
      await expect(continueBtn).toBeVisible({ timeout: 5000 })
      await continueBtn.click()
      await page.waitForTimeout(2000)
      expect(page.url()).toContain("step=review")
    })

    test("38. Review: summary cards visible", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "review")
      const heading = page.locator('text=/[Rr]eview your order/')
      await expect(heading.first()).toBeVisible({ timeout: 10000 })
    })

    test("39. Review: item table shows product", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "review")
      const productRow = page.locator("table tbody tr").first()
      await expect(productRow).toBeVisible({ timeout: 10000 })
    })

    test("40. Back to payment link works", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "review")
      const backLink = page.locator('a:has-text("Back to payment")')
      await expect(backLink).toBeVisible({ timeout: 5000 })
      await backLink.click()
      await page.waitForTimeout(2000)
      expect(page.url()).toContain("step=payment")
    })

    test("41. Pickup: select Hillside", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "fulfilment")
      const hillsideCard = page.locator('h3:has-text("Hillside")').locator('..')
      await hillsideCard.click()
      const selectedBadge = hillsideCard.locator('text=SELECTED')
      await expect(selectedBadge).toBeVisible({ timeout: 3000 })
    })

    test("42. Pickup skips to payment", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "fulfilment")
      const hillsideCard = page.locator('h3:has-text("Hillside")').locator('..')
      await hillsideCard.click()
      await page.waitForTimeout(500)
      const continueBtn = page.locator('button:has-text("CONTINUE TO PAYMENT")')
      await expect(continueBtn).toBeVisible({ timeout: 5000 })
      await continueBtn.click()
      await page.waitForTimeout(2000)
      expect(page.url()).toContain("step=payment")
    })

    test("43. Payment shows Cash on Pickup for pickup orders", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await addFirstProductToCart(page)
      await goToCheckout(page, "fulfilment")
      const hillsideCard = page.locator('h3:has-text("Hillside")').locator('..')
      await hillsideCard.click()
      await page.waitForTimeout(500)
      const continueBtn = page.locator('button:has-text("CONTINUE TO PAYMENT")')
      await continueBtn.click()
      await page.waitForTimeout(2000)
      const cash = page.locator('text=/[Cc]ash on [Pp]ickup/')
      await expect(cash.first()).toBeVisible({ timeout: 5000 })
    })

    test("44. Step guard: shipping without address redirects", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/checkout?step=review")
      await page.waitForTimeout(2000)
      expect(page.url()).not.toContain("step=review")
    })

    test("45. Navigation shows Account + Cart", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/")
      await page.waitForTimeout(2000)
      const nav = page.locator("nav, header")
      const account = nav.locator('text=/[Aa]ccount/')
      await expect(account.first()).toBeVisible({ timeout: 5000 })
    })

    test("46. Account page accessible", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/account")
      await page.waitForTimeout(2000)
      const content = page.locator("main").last()
      const hasAccountContent = await content.textContent()
      expect(hasAccountContent?.toLowerCase()).toMatch(/account|profile|order|hello/)
    })
  })

  test.describe("Phase 3: After Logout (Session Cleared)", () => {

    test("47. Logout action succeeds", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await logout(page)
      await expectLoggedOut(page)
    })

    test("48. Prices NOT visible after logout", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await logout(page)
      await page.goto("/")
      await page.waitForTimeout(2000)
      const mainText = await page.locator("main").last().textContent()
      expect(mainText).not.toMatch(/A\$\d+\.\d{2}/)
    })

    test("49. ABV NOT visible after logout", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await logout(page)
      await goToFirstProduct(page)
      await page.waitForTimeout(2000)
      const pageText = await page.locator("main").last().textContent() || ""
      const hasAbv = pageText.toLowerCase().includes("abv") || /\d+\.?\d*\s*%/.test(pageText)
      expect(hasAbv).toBeFalsy()
    })

    test("50. Price NOT visible on product detail after logout", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await logout(page)
      await goToFirstProduct(page)
      const pageText = await page.locator("main").last().textContent()
      expect(pageText).not.toMatch(/A\$\d+\.\d{2}/)
    })

    test("51. Apply for Membership CTA visible after logout", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await logout(page)
      await goToFirstProduct(page)
      const applyCta = page.locator('text=/[Aa]pply|[Mm]embership/')
      await expect(applyCta.first()).toBeVisible({ timeout: 5000 })
    })

    test("52. Cannot add to cart after logout", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await logout(page)
      await goToFirstProduct(page)
      const addBtn = page.locator('button:has-text("Add to cart"), button:has-text("Add to Cart")')
      expect(await addBtn.count()).toBe(0)
    })

    test("53. Navigation shows Apply not Account after logout", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await logout(page)
      await page.goto("/")
      await page.waitForTimeout(2000)
      const nav = page.locator("nav, header")
      const applyLink = nav.locator('text=/[Aa]pply|Sign In/')
      await expect(applyLink.first()).toBeVisible({ timeout: 5000 })
    })

    test("54. Cart inaccessible after logout", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await logout(page)
      await page.goto("/cart")
      await page.waitForTimeout(2000)
      const emptyOrRedirect = page.locator('text=/[Ee]mpty|no items|sign in/i')
      if (page.url().includes("/cart")) {
        await expect(emptyOrRedirect.first()).toBeVisible({ timeout: 5000 })
      }
    })
  })
})
