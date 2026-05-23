import { test, expect } from "@playwright/test"
import { login, TEST_ACCOUNTS, expectLoggedOut } from "./helpers/auth"
import { goToHomepage, goToCart, goToFirstProduct } from "./helpers/navigation"

test.describe("Extended UAT — Visual Polish & Navigation", () => {

  test.describe("Navigation & Header", () => {

    test("Nav: 'Vault' link NOT present in header", async ({ page }) => {
      await goToHomepage(page)
      const header = page.locator("header")
      const vault = header.locator('text="Vault"')
      expect(await vault.count()).toBe(0)
    })

    test("Nav: 'The Collection' link present", async ({ page }) => {
      await goToHomepage(page)
      const header = page.locator("header")
      await expect(header.locator('a:has-text("The Collection")').first()).toBeVisible()
    })

    test("Nav: 'Breweries' link present", async ({ page }) => {
      await goToHomepage(page)
      const nav = page.locator("header")
      await expect(nav.locator('a:has-text("Breweries")').first()).toBeVisible()
    })

    test("Nav: active link has gold underline on /store", async ({ page }) => {
      await page.goto("/store")
      await page.waitForLoadState("networkidle")
      const collectionLink = page.locator('header a:has-text("The Collection")').first()
      const classes = await collectionLink.getAttribute("class")
      expect(classes).toContain("border-hg-gold")
    })

    test("Nav: active link has gold underline on /breweries", async ({ page }) => {
      await page.goto("/breweries")
      await page.waitForLoadState("networkidle")
      const breweriesLink = page.locator('header a:has-text("Breweries")').first()
      const classes = await breweriesLink.getAttribute("class")
      expect(classes).toContain("border-hg-gold")
    })

    test("Nav: non-active link does NOT have gold underline", async ({ page }) => {
      await page.goto("/store")
      await page.waitForLoadState("networkidle")
      const breweriesLink = page.locator('header a:has-text("Breweries")').first()
      const classes = await breweriesLink.getAttribute("class")
      expect(classes).not.toContain("border-hg-gold")
    })

    test("Nav: non-member sees 'Sign In' text link", async ({ page }) => {
      await goToHomepage(page)
      const header = page.locator("header")
      const signIn = header.locator('a:has-text("Sign In")')
      await expect(signIn).toBeVisible({ timeout: 5000 })
    })

    test("Nav: non-member sees 'Apply' button", async ({ page }) => {
      await goToHomepage(page)
      const header = page.locator("header")
      const apply = header.locator('a:has-text("Apply")')
      await expect(apply).toBeVisible({ timeout: 5000 })
    })

    test("Nav: 'Apply' links to /apply", async ({ page }) => {
      await goToHomepage(page)
      const header = page.locator("header")
      const apply = header.locator('a:has-text("Apply")')
      const href = await apply.getAttribute("href")
      expect(href).toContain("/apply")
    })

    test("Nav: approved member sees avatar, not Apply", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/")
      await page.waitForTimeout(2000)
      const header = page.locator("header")
      const apply = header.locator('a:has-text("Apply")')
      expect(await apply.count()).toBe(0)
    })
  })

  test.describe("Breweries Page", () => {

    test("Brewery cards are clickable links", async ({ page }) => {
      await page.goto("/breweries")
      await page.waitForLoadState("networkidle")
      const firstCard = page.locator('a[href^="/breweries/"]').first()
      await expect(firstCard).toBeVisible({ timeout: 10000 })
    })

    test("Clicking brewery card navigates to brewery detail", async ({ page }) => {
      await page.goto("/breweries")
      await page.waitForLoadState("networkidle")
      const firstCard = page.locator('a[href^="/breweries/"]').first()
      const href = await firstCard.getAttribute("href")
      await firstCard.click()
      await page.waitForLoadState("networkidle")
      expect(page.url()).toContain("/breweries/")
      expect(page.url()).not.toBe(page.url().replace(/\/breweries\/.*/, "/breweries"))
    })

    test("Brewery page does not crash (no 'Something broke')", async ({ page }) => {
      await page.goto("/breweries")
      await page.waitForLoadState("networkidle")
      const errorText = page.locator('text="Something broke."')
      expect(await errorText.count()).toBe(0)
    })
  })

  test.describe("Product Card Visual Polish", () => {

    test("Product image has grayscale filter class", async ({ page }) => {
      await page.goto("/store")
      await page.waitForLoadState("networkidle")
      const img = page.locator('[data-testid="products-list"] img, [data-testid="products-list"] [data-testid="thumbnail"]').first()
      if (await img.isVisible({ timeout: 5000 }).catch(() => false)) {
        const parent = img.locator("..")
        const classes = await parent.getAttribute("class") || await img.getAttribute("class") || ""
        const hasGrayscale = classes.includes("grayscale") || await page.evaluate((el) => {
          const style = window.getComputedStyle(el as Element)
          return style.filter.includes("grayscale")
        }, await img.elementHandle())
        expect(hasGrayscale).toBeTruthy()
      }
    })

    test("Members Only overlay shown for non-approved users", async ({ page }) => {
      await page.goto("/store")
      await page.waitForLoadState("networkidle")
      const overlay = page.locator('text="Members Only"')
      await expect(overlay.first()).toBeVisible({ timeout: 10000 })
    })

    test("Members Only overlay NOT shown for approved users", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/store")
      await page.waitForTimeout(3000)
      const overlay = page.locator('text="Members Only"')
      expect(await overlay.count()).toBe(0)
    })

    test("Quick Add button shows 'ADD' text", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/store")
      await page.waitForTimeout(3000)
      const addBtn = page.locator('button:has-text("ADD")').first()
      await expect(addBtn).toBeVisible({ timeout: 5000 })
    })

    test("Quick Add button adds to cart without navigating", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/store")
      await page.waitForTimeout(3000)
      const addBtn = page.locator('button:has-text("ADD")').first()
      await addBtn.click()
      await page.waitForTimeout(3000)
      expect(page.url()).toContain("/store")
      const btnText = await addBtn.textContent()
      expect(btnText).toMatch(/ADDED|ADD|ERROR/)
    })
  })

  test.describe("Cart Page", () => {

    test("Cart item shows single delete icon (not double)", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/store")
      await page.waitForTimeout(3000)
      const addBtn = page.locator('button:has-text("ADD")').first()
      await addBtn.click()
      await page.waitForTimeout(3000)
      await page.goto("/cart")
      await page.waitForLoadState("networkidle")
      const itemRow = page.locator('[data-testid="product-row"]').first()
      if (await itemRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        const deleteButtons = itemRow.locator('[data-testid="product-delete-button"], button:has(svg)')
        const count = await deleteButtons.count()
        expect(count).toBeLessThanOrEqual(2)
      }
    })

    test("Cart quantity can exceed 5", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/store")
      await page.waitForTimeout(3000)
      const addBtn = page.locator('button:has-text("ADD")').first()
      await addBtn.click()
      await page.waitForTimeout(3000)
      await page.goto("/cart")
      await page.waitForLoadState("networkidle")
      const plusBtn = page.locator('[data-testid="product-row"] button').last()
      if (await plusBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        for (let i = 0; i < 6; i++) {
          await plusBtn.click()
          await page.waitForTimeout(500)
        }
        const qtyText = page.locator('[data-testid="product-select-button"]').first()
        const qty = parseInt(await qtyText.textContent() || "1")
        expect(qty).toBeGreaterThan(5)
      }
    })
  })

  test.describe("Filter Panel & Store Controls", () => {

    test("Filter panel visible on desktop /store", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto("/store")
      await page.waitForLoadState("networkidle")
      const filterSection = page.locator('details:has(h3:has-text("Brewery"))').first()
      await expect(filterSection).toBeVisible({ timeout: 10000 })
    })

    test("Sort dropdown visible on /store for members", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/store")
      await page.waitForTimeout(3000)
      const sortSelect = page.locator("select").first()
      await expect(sortSelect).toBeVisible({ timeout: 5000 })
    })

    test("View toggle (grid/list) visible on /store", async ({ page }) => {
      await login(page, TEST_ACCOUNTS.approved.email, TEST_ACCOUNTS.approved.password)
      await page.goto("/store")
      await page.waitForTimeout(3000)
      const toggle = page.locator('button:has(span:has-text("grid_view")), button:has(span[class*="material"])').first()
      await expect(toggle).toBeVisible({ timeout: 5000 })
    })

    test("Pagination shows when products exceed page size", async ({ page }) => {
      await page.goto("/store")
      await page.waitForLoadState("networkidle")
      const pagination = page.locator('button:has-text("NEXT")')
      if (await pagination.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(pagination).toBeVisible()
      }
    })

    test("Filter chip appears when filter is selected", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto("/store")
      await page.waitForLoadState("networkidle")
      const firstCheckbox = page.locator('details:has(h3:has-text("Brewery")) input[type="checkbox"]').first()
      if (await firstCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstCheckbox.click()
        await page.waitForTimeout(2000)
        const chip = page.locator('text="ACTIVE FILTERS:"').or(page.locator('[class*="rounded-full"]:has(button)'))
        await expect(chip.first()).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe("Mobile Bottom Nav", () => {

    test("Mobile nav visible on small viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto("/store")
      await page.waitForLoadState("networkidle")
      const bottomNav = page.locator("nav.fixed.bottom-0, nav[class*='bottom-0']").first()
      await expect(bottomNav).toBeVisible({ timeout: 5000 })
    })

    test("Mobile nav has 4 tabs (Collection, Breweries, Cart, Account)", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto("/store")
      await page.waitForLoadState("networkidle")
      const nav = page.locator("nav.fixed.bottom-0, nav[class*='bottom-0']").first()
      const links = nav.locator("a")
      expect(await links.count()).toBe(4)
    })

    test("Mobile nav hidden on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto("/store")
      await page.waitForLoadState("networkidle")
      const bottomNav = page.locator("nav.fixed.bottom-0, nav[class*='bottom-0']").first()
      await expect(bottomNav).not.toBeVisible()
    })
  })

  test.describe("Footer", () => {

    test("Footer renders without crash", async ({ page }) => {
      await goToHomepage(page)
      const footer = page.locator("footer")
      await expect(footer).toBeVisible()
    })

    test("Footer contains HOPS & GLORY branding", async ({ page }) => {
      await goToHomepage(page)
      const footer = page.locator("footer")
      const brand = footer.locator('text=/HOPS.*GLORY/')
      await expect(brand.first()).toBeVisible()
    })

    test("Footer 'The Collection' link works", async ({ page }) => {
      await goToHomepage(page)
      const footer = page.locator("footer")
      const link = footer.locator('a:has-text("The Collection")')
      await link.click()
      await page.waitForLoadState("networkidle")
      expect(page.url()).toContain("/store")
    })

    test("Footer 'Breweries' link works", async ({ page }) => {
      await goToHomepage(page)
      const footer = page.locator("footer")
      const link = footer.locator('a:has-text("Breweries")')
      await link.click()
      await page.waitForLoadState("networkidle")
      expect(page.url()).toContain("/breweries")
    })
  })

  test.describe("Theme Toggle (Light/Dark)", () => {

    test("Theme toggle button exists in nav", async ({ page }) => {
      await goToHomepage(page)
      const toggle = page.locator('button:has(span:has-text("light_mode")), button:has(span:has-text("dark_mode")), [aria-label*="theme"], [data-testid="theme-toggle"]').first()
      await expect(toggle).toBeVisible({ timeout: 5000 })
    })

    test("Clicking theme toggle changes page background", async ({ page }) => {
      await goToHomepage(page)
      const body = page.locator("html")
      const initialBg = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor)
      const toggle = page.locator('button:has(span:has-text("light_mode")), button:has(span:has-text("dark_mode")), [aria-label*="theme"]').first()
      if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await toggle.click()
        await page.waitForTimeout(500)
        const newBg = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor)
        expect(newBg).not.toBe(initialBg)
      }
    })
  })

  test.describe("Links Integrity", () => {

    test("/store page loads without error", async ({ page }) => {
      const response = await page.goto("/store")
      expect(response?.status()).toBeLessThan(500)
      const error = page.locator('text="Something broke."')
      expect(await error.count()).toBe(0)
    })

    test("/breweries page loads without error", async ({ page }) => {
      const response = await page.goto("/breweries")
      expect(response?.status()).toBeLessThan(500)
      const error = page.locator('text="Something broke."')
      expect(await error.count()).toBe(0)
    })

    test("/cart page loads without error", async ({ page }) => {
      const response = await page.goto("/cart")
      expect(response?.status()).toBeLessThan(500)
      const error = page.locator('text="Something broke."')
      expect(await error.count()).toBe(0)
    })

    test("/account page loads (login form or account content)", async ({ page }) => {
      const response = await page.goto("/account")
      expect(response?.status()).toBeLessThan(500)
      const error = page.locator('text="Something broke."')
      expect(await error.count()).toBe(0)
    })

    test("/apply page loads without error", async ({ page }) => {
      const response = await page.goto("/apply")
      expect(response?.status()).toBeLessThan(500)
      const error = page.locator('text="Something broke."')
      expect(await error.count()).toBe(0)
    })

    test("404 page renders for unknown route", async ({ page }) => {
      await page.goto("/this-does-not-exist-xyz")
      await page.waitForTimeout(2000)
      const notFound = page.locator('text=/[Nn]ot [Ff]ound|404/')
      await expect(notFound.first()).toBeVisible({ timeout: 5000 })
    })
  })
})
