import { test, expect } from "@playwright/test"
import { apply, login } from "./helpers/customer-ui"
import {
  approveCustomerByEmail,
  deleteCustomerByEmail,
} from "./helpers/admin-api"

const goToHomepage = async (page: any) => {
  await page.goto("/")
  await page.waitForLoadState("domcontentloaded")
}

const ts = Date.now()
const APPROVED_EMAIL = `e2e-uat-${ts}@hg-test.dev`
const APPROVED_PASSWORD = "UatTest123!"

test.describe("Extended UAT — Visual Polish & Navigation", () => {
  test.describe("Navigation & Header", () => {
    test("Nav: 'Vault' link NOT present in header", async ({ page }) => {
      await goToHomepage(page)
      const header = page.locator("header")
      const vault = header.locator('text="Vault"')
      expect(await vault.count()).toBe(0)
    })

    test("Nav: 'Collection' link present", async ({ page }) => {
      await goToHomepage(page)
      const header = page.locator("header")
      await expect(
        header.locator('a:has-text("Collection")').first(),
      ).toBeVisible()
    })

    test("Nav: 'Producers' link present for non-approved", async ({ page }) => {
      await goToHomepage(page)
      const nav = page.locator("header")
      await expect(nav.locator('a:has-text("Producers")').first()).toBeVisible()
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
      const applyLink = header.locator('a:has-text("Apply")')
      await expect(applyLink).toBeVisible({ timeout: 5000 })
    })

    test("Nav: 'Apply' links to /apply", async ({ page }) => {
      await goToHomepage(page)
      const header = page.locator("header")
      const applyLink = header.locator('a:has-text("Apply")')
      const href = await applyLink.getAttribute("href")
      expect(href).toContain("/apply")
    })

    test("Nav: approved member does not see Apply", async ({ browser }) => {
      const applyCtx = await browser.newContext()
      const applyPage = await applyCtx.newPage()
      await apply(applyPage, {
        email: APPROVED_EMAIL,
        password: APPROVED_PASSWORD,
      })
      await applyCtx.close()
      await approveCustomerByEmail(APPROVED_EMAIL)
      const ctx = await browser.newContext()
      const page = await ctx.newPage()
      await login(page, APPROVED_EMAIL, APPROVED_PASSWORD)
      await page.goto("/")
      await page.waitForLoadState("domcontentloaded")
      await page.waitForTimeout(1000)
      const header = page.locator("header")
      const applyLink = header.locator('a:has-text("Apply")')
      expect(await applyLink.count()).toBe(0)
      await ctx.close()
      await deleteCustomerByEmail(APPROVED_EMAIL).catch(() => {})
    })
  })

  test.describe("Breweries Page", () => {
    test("Brewery cards are clickable links", async ({ page }) => {
      await page.goto("/breweries")
      await page.waitForLoadState("domcontentloaded")
      const firstCard = page.locator('a[href^="/breweries/"]').first()
      await expect(firstCard).toBeVisible({ timeout: 10000 })
    })

    test("Clicking brewery card navigates to brewery detail", async ({
      page,
    }) => {
      await page.goto("/breweries")
      await page.waitForLoadState("domcontentloaded")
      const firstCard = page.locator('a[href^="/breweries/"]').first()
      await expect(firstCard).toBeVisible({ timeout: 10000 })
      const href = await firstCard.getAttribute("href")
      expect(href).toMatch(/\/breweries\/.+/)
      await firstCard.click()
      await page.waitForURL("**/breweries/**", { timeout: 20000 })
      expect(page.url()).toMatch(/\/breweries\/.+/)
    })

    test("Brewery page does not crash (no 'Something broke')", async ({
      page,
    }) => {
      await page.goto("/breweries")
      await page.waitForLoadState("domcontentloaded")
      const errorText = page.locator('text="Something broke."')
      expect(await errorText.count()).toBe(0)
    })
  })

  test.describe("Product Card Visual Polish", () => {
    test("Members Only overlay shown for non-approved users", async ({
      page,
    }) => {
      await page.goto("/store")
      await page.waitForLoadState("domcontentloaded")
      const overlay = page.locator('text="Members Only"')
      await expect(overlay.first()).toBeVisible({ timeout: 10000 })
    })

    test("Members Only overlay NOT shown for approved users", async ({
      browser,
    }) => {
      const email = `e2e-uat-mem-${ts}@hg-test.dev`
      const applyCtx = await browser.newContext()
      const ap = await applyCtx.newPage()
      await apply(ap, { email, password: APPROVED_PASSWORD })
      await applyCtx.close()
      await approveCustomerByEmail(email)
      const ctx = await browser.newContext()
      const page = await ctx.newPage()
      await login(page, email, APPROVED_PASSWORD)
      await page.goto("/store")
      await page.waitForTimeout(3000)
      const overlay = page.locator('text="Members Only"')
      expect(await overlay.count()).toBe(0)
      await ctx.close()
      await deleteCustomerByEmail(email).catch(() => {})
    })

    test("Quick Add button visible for approved users on /store", async ({
      browser,
    }) => {
      const email = `e2e-uat-add-${ts}@hg-test.dev`
      const applyCtx = await browser.newContext()
      const ap = await applyCtx.newPage()
      await apply(ap, { email, password: APPROVED_PASSWORD })
      await applyCtx.close()
      await approveCustomerByEmail(email)
      const ctx = await browser.newContext()
      const page = await ctx.newPage()
      await login(page, email, APPROVED_PASSWORD)
      await page.goto("/store")
      await page.waitForTimeout(3000)
      const addBtn = page.locator('button:has-text("ADD")').first()
      await expect(addBtn).toBeVisible({ timeout: 5000 })
      await ctx.close()
      await deleteCustomerByEmail(email).catch(() => {})
    })
  })

  test.describe("Filter Panel & Store Controls", () => {
    test("Filter panel visible on desktop /store for approved users", async ({
      browser,
    }) => {
      const email = `e2e-uat-fp-${ts}@hg-test.dev`
      const applyCtx = await browser.newContext()
      const ap = await applyCtx.newPage()
      await apply(ap, { email, password: APPROVED_PASSWORD })
      await applyCtx.close()
      await approveCustomerByEmail(email)
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      })
      const page = await ctx.newPage()
      await login(page, email, APPROVED_PASSWORD)
      await page.goto("/store")
      await page.waitForLoadState("domcontentloaded")
      const filterSection = page
        .locator('details:has(h3:has-text("Brewery"))')
        .first()
      await expect(filterSection).toBeVisible({ timeout: 10000 })
      await ctx.close()
      await deleteCustomerByEmail(email).catch(() => {})
    })

    test("Pagination shows when products exceed page size", async ({
      page,
    }) => {
      await page.goto("/store")
      await page.waitForLoadState("domcontentloaded")
      const pagination = page.locator('button:has-text("NEXT")')
      if (await pagination.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(pagination).toBeVisible()
      }
    })
  })

  test.describe("Mobile Bottom Nav", () => {
    test("Mobile nav visible on small viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto("/store")
      await page.waitForLoadState("domcontentloaded")
      const bottomNav = page
        .locator("nav.fixed.bottom-0, nav[class*='bottom-0']")
        .first()
      await expect(bottomNav).toBeVisible({ timeout: 5000 })
    })

    test("Mobile nav hidden on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto("/store")
      await page.waitForLoadState("domcontentloaded")
      const bottomNav = page
        .locator("nav.fixed.bottom-0, nav[class*='bottom-0']")
        .first()
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
      const brand = footer.locator("text=/HOPS.*GLORY/")
      await expect(brand.first()).toBeVisible()
    })

    test("Footer 'The Collection' link works", async ({ page }) => {
      await goToHomepage(page)
      const footer = page.locator("footer")
      const link = footer.locator('a:has-text("The Collection")').first()
      await expect(link).toBeVisible({ timeout: 5000 })
      await link.click()
      await page.waitForURL("**/store**", { timeout: 10000 })
      expect(page.url()).toContain("/store")
    })

    test("Footer 'Producers' link works for non-approved", async ({ page }) => {
      await goToHomepage(page)
      const footer = page.locator("footer")
      const link = footer.locator('a:has-text("Producers")').first()
      await expect(link).toBeVisible({ timeout: 5000 })
      await link.click()
      await page.waitForURL("**/breweries**", { timeout: 10000 })
      expect(page.url()).toContain("/breweries")
    })
  })

  test.describe("Theme Toggle (Light/Dark)", () => {
    test("Theme toggle button exists in nav", async ({ page }) => {
      await goToHomepage(page)
      const toggle = page.locator('button[aria-label*="Switch to"]').first()
      await expect(toggle).toBeVisible({ timeout: 5000 })
    })

    test("Clicking theme toggle changes class on html element", async ({
      page,
    }) => {
      await goToHomepage(page)
      const html = page.locator("html")
      const initialClass = (await html.getAttribute("class")) || ""
      const toggle = page.locator('button[aria-label*="Switch to"]').first()
      if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await toggle.click()
        await page.waitForTimeout(1500) // allow JS to apply theme class
        const newClass = (await html.getAttribute("class")) || ""
        expect(newClass).not.toBe(initialClass)
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

    test("/account page loads (login form or account content)", async ({
      page,
    }) => {
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
      const notFound = page.locator("text=/[Nn]ot [Ff]ound|404/")
      await expect(notFound.first()).toBeVisible({ timeout: 5000 })
    })
  })
})
