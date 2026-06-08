import { test, expect } from "@playwright/test"

test.describe("COLLAB pill + collab partners on PDP", () => {
  test("multi-brewery seeded product shows COLLAB pill and Collaboration line", async ({
    page,
  }) => {
    await page.goto("/products/tree-house-x-other-half-tropic-thunder")

    const pill = page.getByTestId("product-pill")
    await expect(pill).toBeVisible({ timeout: 10_000 })
    await expect(pill).toHaveText(/Collab/i)

    // PDP body should mention collaboration with the partner brewery
    await expect(page.locator("body")).toContainText(/Collaboration with/i)
    await expect(
      page.locator(`a[href="/breweries/other-half-brewing"]`),
    ).toBeVisible()
  })

  test("single-brewery seeded product does NOT show COLLAB pill", async ({
    page,
  }) => {
    await page.goto("/products/tree-house-tenth-anniversary")

    // Tenth anniversary has only Tree House linked. May still show ANNIVERSARY pill,
    // but must NOT show "Collab".
    const pillCount = await page.getByTestId("product-pill").count()
    if (pillCount > 0) {
      const pillText = await page.getByTestId("product-pill").innerText()
      expect(pillText).not.toMatch(/Collab/i)
    }

    await expect(page.locator("body")).not.toContainText(/Collaboration with/i)
  })
})
