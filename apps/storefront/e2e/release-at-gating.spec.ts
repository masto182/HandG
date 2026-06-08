import { test, expect } from "@playwright/test"
import { readFileSync } from "fs"
import { resolve } from "path"

function loadPublishableKey(): string {
  if (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY)
    return process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  try {
    const envLocal = readFileSync(resolve(__dirname, "../.env.local"), "utf-8")
    const match = envLocal.match(/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.+)/)
    return match?.[1]?.trim() || ""
  } catch {
    return ""
  }
}

const PUBLISHABLE_KEY = loadPublishableKey()
const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL || "http://localhost:9000"

/**
 * release_at gating: a product with metadata.early_access_until in the future
 * blocks anonymous cart-add at the /store/carts/:id/line-items endpoint with
 * 409 access_not_yet_available.
 *
 * Uses the seeded `tree-house-aurora-prelude` (release_at = +168h).
 */

test.describe("release_at gating on cart-add", () => {
  test("anonymous cart-add for future-release product is blocked with 409 access_not_yet_available", async ({
    request,
  }) => {
    // 1. Find region
    const regionsRes = await request.get(`${BACKEND}/store/regions`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    expect(regionsRes.status()).toBe(200)
    const regions = (await regionsRes.json()).regions
    const region = regions[0]
    expect(region).toBeTruthy()

    // 2. Resolve product variant for the future-release seeded product
    const productsRes = await request.get(
      `${BACKEND}/store/products?handle=tree-house-aurora-prelude&fields=id,handle,*variants,+metadata`,
      { headers: { "x-publishable-api-key": PUBLISHABLE_KEY } },
    )
    expect(productsRes.status()).toBe(200)
    const product = (await productsRes.json()).products[0]
    expect(product).toBeDefined()
    expect(product.metadata?.early_access_until).toBeTruthy()
    const eaUntil = new Date(product.metadata.early_access_until).getTime()
    expect(eaUntil).toBeGreaterThan(Date.now())
    const variantId = product.variants[0].id

    // 3. Create anonymous cart
    const cartRes = await request.post(`${BACKEND}/store/carts`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      data: { region_id: region.id },
    })
    expect(cartRes.status()).toBe(200)
    const cart = (await cartRes.json()).cart

    // 4. Attempt to add the gated variant -> 409
    const addRes = await request.post(
      `${BACKEND}/store/carts/${cart.id}/line-items`,
      {
        headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
        data: { variant_id: variantId, quantity: 1 },
      },
    )
    expect(addRes.status()).toBe(409)
    const body = await addRes.json()
    expect(body.error).toBe("access_not_yet_available")
    expect(body.available_at).toBeTruthy()
    expect(body.your_available_at).toBeTruthy()
  })
})
