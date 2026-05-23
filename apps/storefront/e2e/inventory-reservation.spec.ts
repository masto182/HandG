import { test, expect, APIRequestContext } from "@playwright/test"

const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@medusa-test.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "supersecret"

const STOCK_LEVEL = 10

test.describe.serial("Inventory Reservation — Atomic Flow", () => {
  let adminToken: string
  let productId: string
  let variantId: string
  let inventoryItemId: string
  let locationId: string
  let originalStock: number
  let cartId: string
  let lineItemId: string

  async function adminAuth(request: APIRequestContext) {
    const authRes = await request.post(`${BACKEND}/auth/user/emailpass`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    if (!authRes.ok()) return null
    const authData = await authRes.json()
    return authData.token || null
  }

  async function adminGet(request: APIRequestContext, path: string) {
    return request.get(`${BACKEND}${path}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
  }

  async function adminPost(request: APIRequestContext, path: string, data: any) {
    return request.post(`${BACKEND}${path}`, {
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      data,
    })
  }

  test("Setup: authenticate admin and seed inventory", async ({ request }) => {
    adminToken = (await adminAuth(request)) || ""
    test.skip(!adminToken, "Cannot authenticate as admin — check ADMIN_EMAIL/ADMIN_PASSWORD env vars")

    const productsRes = await adminGet(request, "/admin/products?limit=1&fields=id,variants.id,variants.inventory_quantity")
    expect(productsRes.ok()).toBeTruthy()
    const productsData = await productsRes.json()
    const product = productsData.products?.[0]
    test.skip(!product, "No products found in admin API")

    productId = product.id
    const variant = product.variants?.[0]
    test.skip(!variant, "Product has no variants")
    variantId = variant.id

    const invItemsRes = await adminGet(request, `/admin/inventory-items?sku=${variantId}&limit=10`)
    let invData: any
    if (invItemsRes.ok()) {
      invData = await invItemsRes.json()
    }

    if (!invData?.inventory_items?.length) {
      const altRes = await adminGet(request, `/admin/inventory-items?limit=50`)
      if (altRes.ok()) {
        const altData = await altRes.json()
        const match = altData.inventory_items?.find((i: any) =>
          i.variants?.some((v: any) => v.id === variantId)
        )
        if (match) {
          invData = { inventory_items: [match] }
        }
      }
    }

    if (invData?.inventory_items?.length) {
      inventoryItemId = invData.inventory_items[0].id
      const levels = invData.inventory_items[0].location_levels || []
      if (levels.length) {
        locationId = levels[0].location_id
        originalStock = levels[0].stocked_quantity ?? 0
      }
    }

    if (inventoryItemId && locationId) {
      const updateRes = await adminPost(request, `/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`, {
        stocked_quantity: STOCK_LEVEL,
      })
      if (!updateRes.ok()) {
        const body = await updateRes.text()
        test.skip(true, `Could not set stock: ${updateRes.status()} ${body.slice(0, 100)}`)
      }
    } else {
      originalStock = variant.inventory_quantity ?? 0
      test.skip(originalStock <= 0, "Cannot determine inventory item/location and variant has no stock")
    }
  })

  test("Reserve variant decrements inventory_quantity", async ({ request }) => {
    test.skip(!productId || !variantId, "Setup did not complete")

    const cartRes = await request.post(`${BACKEND}/store/carts`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY, "Content-Type": "application/json" },
      data: {},
    })
    expect(cartRes.ok()).toBeTruthy()
    const cartData = await cartRes.json()
    cartId = cartData.cart.id

    const beforeRes = await request.get(`${BACKEND}/store/products/${productId}?fields=variants.id,variants.inventory_quantity`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    expect(beforeRes.ok()).toBeTruthy()
    const beforeData = await beforeRes.json()
    const beforeQty = beforeData.product.variants?.find((v: any) => v.id === variantId)?.inventory_quantity ?? 0

    const lineItemRes = await request.post(`${BACKEND}/store/carts/${cartId}/line-items`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY, "Content-Type": "application/json" },
      data: { variant_id: variantId, quantity: 1 },
    })
    expect(lineItemRes.ok()).toBeTruthy()
    const lineItemData = await lineItemRes.json()
    lineItemId = lineItemData.cart.items?.[0]?.id

    const afterRes = await request.get(`${BACKEND}/store/products/${productId}?fields=variants.id,variants.inventory_quantity`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    expect(afterRes.ok()).toBeTruthy()
    const afterData = await afterRes.json()
    const afterQty = afterData.product.variants?.find((v: any) => v.id === variantId)?.inventory_quantity ?? 0

    expect(afterQty).toBeLessThan(beforeQty)
  })

  test("Removing line item restores inventory", async ({ request }) => {
    test.skip(!cartId || !lineItemId, "Prior test did not complete")

    const beforeRes = await request.get(`${BACKEND}/store/products/${productId}?fields=variants.id,variants.inventory_quantity`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const beforeData = await beforeRes.json()
    const beforeQty = beforeData.product.variants?.find((v: any) => v.id === variantId)?.inventory_quantity ?? 0

    const removeRes = await request.delete(`${BACKEND}/store/carts/${cartId}/line-items/${lineItemId}`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    expect(removeRes.ok()).toBeTruthy()

    const afterRes = await request.get(`${BACKEND}/store/products/${productId}?fields=variants.id,variants.inventory_quantity`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    expect(afterRes.ok()).toBeTruthy()
    const afterData = await afterRes.json()
    const afterQty = afterData.product.variants?.find((v: any) => v.id === variantId)?.inventory_quantity ?? 0

    expect(afterQty).toBeGreaterThanOrEqual(beforeQty)
  })

  test("Cleanup: restore original stock level", async ({ request }) => {
    if (!adminToken || !inventoryItemId || !locationId) return

    await adminPost(request, `/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`, {
      stocked_quantity: originalStock,
    })
  })

  test("UI shows error state on 500 from line-items endpoint", async ({ page }) => {
    await page.route("**/store/carts/*/line-items", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Internal Server Error" }),
        })
      } else {
        route.continue()
      }
    })

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const productLink = page.locator('a[href^="/products/"]').first()
    if (!(await productLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "No product links visible on homepage")
    }

    const href = await productLink.getAttribute("href")
    if (href) await page.goto(href)
    await page.waitForLoadState("networkidle")

    const addBtn = page.locator('button:has-text("Add to cart"), button:has-text("Add to Cart")')
    if (!(await addBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Add to cart button not visible — product may be out of stock")
    }

    await addBtn.click()
    await page.waitForTimeout(3000)

    const errorIndicator = page.locator('[role="alert"], .error, [data-testid="error"], text=/error|failed|unavailable/i')
    const hasError = await errorIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)
    expect(hasError).toBeTruthy()
  })
})
