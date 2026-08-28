import { renderEmail } from "../../lib/render-email"
import * as SpecialsBroadcast from "../../emails/specials-broadcast"
import type { SpecialsBatchItem } from "../../emails/_components/SpecialsProductRow"

const STORE_URL = "https://hopsandglory.au"

function item(overrides: Partial<SpecialsBatchItem> = {}): SpecialsBatchItem {
  return {
    productTitle: "Julius",
    productHandle: "tree-house-julius",
    productThumbnail: "https://cdn.example.com/julius.jpg",
    originalPrice: 25,
    discountedPrice: 20,
    discountType: "percentage",
    discountValue: 20,
    ...overrides,
  }
}

describe("specials-broadcast email", () => {
  it("uses a generic subject and heading for multiple items", async () => {
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      items: [item(), item({ productTitle: "Green", productHandle: "green" })],
      storeUrl: STORE_URL,
    })
    expect(out.subject).toBe("This week's specials")
    expect(out.html).toMatch(/This week(&#x27;|')s specials/)
  })

  it("uses a product-specific subject when only one item is on special", async () => {
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      items: [item()],
      storeUrl: STORE_URL,
    })
    expect(out.subject).toBe("On special: Julius")
  })

  it("renders struck-through original price and discounted price for each item", async () => {
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      items: [item()],
      storeUrl: STORE_URL,
    })
    expect(out.html).toContain("$25.00")
    expect(out.html).toContain("$20.00")
    expect(out.html).toContain("line-through")
    expect(out.html).toContain("20% off")
  })

  it("renders fixed-dollar discount label correctly", async () => {
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      items: [item({ discountType: "fixed", discountValue: 5, discountedPrice: 20 })],
      storeUrl: STORE_URL,
    })
    expect(out.html).toContain("$5.00 off")
  })

  it("renders multiple product items, links to each product handle", async () => {
    const items = [
      item({ productTitle: "Julius", productHandle: "a" }),
      item({ productTitle: "Green", productHandle: "b" }),
    ]
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      items,
      storeUrl: STORE_URL,
    })
    expect(out.html).toContain("Julius")
    expect(out.html).toContain("Green")
    expect(out.html).toContain("/products/a")
    expect(out.html).toContain("/products/b")
  })

  it("renders the optional custom message when present", async () => {
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      message: "Only while stocks last - grab them before Friday!",
      items: [item()],
      storeUrl: STORE_URL,
    })
    expect(out.html).toContain("Only while stocks last - grab them before Friday!")
  })

  it("omits the message block when not provided", async () => {
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      items: [item()],
      storeUrl: STORE_URL,
    })
    expect(out.html).not.toContain("Only while stocks last")
  })

  it("missing thumbnail renders no broken <img> tag", async () => {
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      items: [item({ productThumbnail: null })],
      storeUrl: STORE_URL,
    })
    expect(out.html).not.toContain("<img")
  })

  it("features only the 12 steepest discounts and links to the rest when over the cap", async () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      item({
        productTitle: `Beer ${i}`,
        productHandle: `beer-${i}`,
        discountValue: i, // Beer 19 has the steepest discount, Beer 0 the shallowest
      })
    )
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      items,
      storeUrl: STORE_URL,
    })
    expect(out.html).toContain("/products/beer-19")
    expect(out.html).toContain("/products/beer-8")
    expect(out.html).not.toContain("/products/beer-7")
    expect(out.html).not.toContain("/products/beer-0")
    expect(out.html).toMatch(/Plus\s*(<!--.*?-->)?\s*8\s*(<!--.*?-->)?\s*more special/)
    expect(out.html).toContain("see them all")
  })

  it("does not add a featured-cap link when at or under the cap", async () => {
    const items = Array.from({ length: 12 }, (_, i) =>
      item({ productTitle: `Beer ${i}`, productHandle: `beer-${i}` })
    )
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      items,
      storeUrl: STORE_URL,
    })
    expect(out.html).not.toContain("see them all")
  })

  it("renders prices when they arrive as strings, matching what pg returns for NUMERIC columns", async () => {
    // Regression: specials_batch_item.original_price/discounted_price are DB
    // `numeric` columns - node-postgres returns those as strings, not numbers,
    // to avoid silent precision loss. A real send failed in production
    // (TypeError: amount.toFixed is not a function) because the dispatch job
    // passed the DB row straight through without coercing to Number first.
    const stringPricedItem = item({
      originalPrice: "25.00" as any,
      discountedPrice: "20.00" as any,
    })
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      items: [stringPricedItem],
      storeUrl: STORE_URL,
    })
    expect(out.html).toContain("$25.00")
    expect(out.html).toContain("$20.00")
  })
})
