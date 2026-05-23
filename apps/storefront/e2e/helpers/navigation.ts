import { Page, expect } from "@playwright/test"

export async function goToHomepage(page: Page) {
  await page.goto("/")
  await page.waitForLoadState("networkidle")
}

export async function goToFirstProduct(page: Page) {
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  const productLink = page.locator('a[href^="/products/"]').first()
  await expect(productLink).toBeVisible({ timeout: 10000 })
  const href = await productLink.getAttribute("href")
  if (href) {
    await page.goto(href)
    await page.waitForLoadState("networkidle")
  } else {
    await productLink.click()
    await page.waitForLoadState("networkidle")
  }
}

export async function goToCart(page: Page) {
  await page.goto("/cart")
  await page.waitForLoadState("networkidle")
}

export async function goToCheckout(page: Page, step = "fulfilment") {
  await page.goto(`/checkout?step=${step}`)
  await page.waitForLoadState("networkidle")
}

export async function addFirstProductToCart(page: Page) {
  await goToFirstProduct(page)
  await page.waitForTimeout(1000)
  const addBtn = page.locator('button:has-text("Add to cart"), button:has-text("Add to Cart")')
  await expect(addBtn).toBeVisible({ timeout: 5000 })
  await addBtn.click()
  await page.waitForTimeout(3000)
}

export async function expectPriceVisible(page: Page) {
  const price = page.locator('text=/A\\$\\d/')
  await expect(price.first()).toBeVisible({ timeout: 5000 })
}

export async function expectPriceNotVisible(page: Page) {
  const priceElements = page.locator('[data-testid="product-price"], [data-testid="price"]')
  if (await priceElements.count() > 0) {
    await expect(priceElements.first()).not.toBeVisible()
  }
  const dollarSign = page.locator('.product-card >> text=/A\\$\\d/')
  expect(await dollarSign.count()).toBe(0)
}

export async function goToBreweryPage(page: Page) {
  await page.goto("/breweries")
  await page.waitForLoadState("networkidle")
  const breweryLink = page.locator('a[href^="/breweries/"]').first()
  if (await breweryLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await breweryLink.click()
    await page.waitForLoadState("networkidle")
  }
}
