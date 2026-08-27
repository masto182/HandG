import { renderEmail } from "../../lib/render-email"
import * as SpecialsBroadcast from "../../emails/specials-broadcast"
import type { SpecialsBatchItem } from "../../emails/_components/SpecialsProductRow"

const STORE_URL = "https://hopsandglory.au"

function item(overrides: Partial<SpecialsBatchItem> = {}): SpecialsBatchItem {
  return {
    productTitle: "Julius",
    productHandle: "tree-house-julius",
    productThumbnail: "https://cdn.example.com/julius.jpg",
    originalPrice: 2500,
    discountedPrice: 2000,
    discountType: "percentage",
    discountValue: 20,
    ...overrides,
  }
}

describe("specials-broadcast email", () => {
  it("renders campaign title as subject and heading", async () => {
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      campaignTitle: "48h Flash Sale",
      campaignDescription: null,
      endsAtLabel: null,
      items: [item()],
      storeUrl: STORE_URL,
    })
    expect(out.subject).toBe("48h Flash Sale")
    expect(out.html).toContain("48h Flash Sale")
  })

  it("renders struck-through original price and discounted price for each item", async () => {
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      campaignTitle: "Flash Sale",
      campaignDescription: null,
      endsAtLabel: null,
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
      campaignTitle: "Flash Sale",
      campaignDescription: null,
      endsAtLabel: null,
      items: [item({ discountType: "fixed", discountValue: 5, discountedPrice: 2000 })],
      storeUrl: STORE_URL,
    })
    expect(out.html).toContain("$5.00 off")
  })

  it("renders campaign description and ends-at urgency copy when present", async () => {
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      campaignTitle: "Flash Sale",
      campaignDescription: "Limited stock, act fast.",
      endsAtLabel: "Friday, 28 Aug",
      items: [item()],
      storeUrl: STORE_URL,
    })
    expect(out.html).toContain("Limited stock, act fast.")
    expect(out.html).toMatch(/Ends\s*(<!--.*?-->)?\s*Friday, 28 Aug/)
  })

  it("omits description/urgency blocks when not present", async () => {
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      campaignTitle: "Flash Sale",
      campaignDescription: null,
      endsAtLabel: null,
      items: [item()],
      storeUrl: STORE_URL,
    })
    expect(out.html).not.toContain("Ends")
  })

  it("renders multiple product items, links to each product handle", async () => {
    const items = [
      item({ productTitle: "Julius", productHandle: "a" }),
      item({ productTitle: "Green", productHandle: "b" }),
    ]
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      campaignTitle: "Flash Sale",
      campaignDescription: null,
      endsAtLabel: null,
      items,
      storeUrl: STORE_URL,
    })
    expect(out.html).toContain("Julius")
    expect(out.html).toContain("Green")
    expect(out.html).toContain("/products/a")
    expect(out.html).toContain("/products/b")
  })

  it("missing thumbnail renders no broken <img> tag", async () => {
    const out = await renderEmail(SpecialsBroadcast as any, {
      name: "Cam",
      campaignTitle: "Flash Sale",
      campaignDescription: null,
      endsAtLabel: null,
      items: [item({ productThumbnail: null })],
      storeUrl: STORE_URL,
    })
    expect(out.html).not.toContain("<img")
  })
})
