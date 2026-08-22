import { renderEmail } from "../../lib/render-email"
import * as NewDropDigest from "../../emails/new-drop-digest"
import type { NewDropDigestProduct } from "../../emails/new-drop-digest"

const STORE_URL = "https://hopsandglory.au"

function product(overrides: Partial<NewDropDigestProduct> = {}): NewDropDigestProduct {
  return {
    beerName: "Julius",
    breweryName: "Tree House Brewing",
    image: "https://cdn.example.com/julius.jpg",
    handle: "tree-house-julius",
    dispatchId: "disp_1",
    hopTag: null,
    ...overrides,
  }
}

describe("new-drop-digest email - personalized (brewery/hop sections)", () => {
  it("brewery-led single product: personalised subject, image, brewery, tracked link", async () => {
    const out = await renderEmail(NewDropDigest as any, {
      name: "Cam",
      brewerySection: { label: "Tree House Brewing", products: [product()] },
      hopSection: null,
      generalSection: null,
      storeUrl: STORE_URL,
    })
    expect(out.subject).toBe("New drop: Julius")
    expect(out.html).toContain("Julius")
    expect(out.html).toContain("Tree House Brewing")
    expect(out.html).toContain("https://cdn.example.com/julius.jpg")
    expect(out.html).toContain("/products/tree-house-julius?alert=disp_1")
  })

  it("brewery lead names the brewery in the heading/subject for multiple products", async () => {
    const products = [
      product({ beerName: "Julius", handle: "tree-house-julius", dispatchId: "d1" }),
      product({ beerName: "Green", handle: "tree-house-green", dispatchId: "d2" }),
    ]
    const out = await renderEmail(NewDropDigest as any, {
      name: "Cam",
      brewerySection: { label: "Tree House", products },
      hopSection: null,
      generalSection: null,
      storeUrl: STORE_URL,
    })
    expect(out.subject).toBe("New releases from Tree House")
    expect(out.html).toContain("Julius")
    expect(out.html).toContain("Green")
    expect(out.html).toContain("/products/tree-house-julius?alert=d1")
    expect(out.html).toContain("/products/tree-house-green?alert=d2")
  })

  it("brewery beer tagged with a matched hop renders the tag", async () => {
    const out = await renderEmail(NewDropDigest as any, {
      name: "Cam",
      brewerySection: { label: "Tree House", products: [product({ hopTag: "Citra" })] },
      hopSection: null,
      generalSection: null,
      storeUrl: STORE_URL,
    })
    expect(out.html).toMatch(/Featuring\s*(<!--.*?-->)?\s*Citra/)
  })

  it("brewery section plus a secondary hop section in the same email", async () => {
    const out = await renderEmail(NewDropDigest as any, {
      name: "Cam",
      brewerySection: { label: "Tree House", products: [product({ beerName: "Julius" })] },
      hopSection: {
        label: "Peacherine",
        products: [product({ beerName: "Sundial", breweryName: "Brujos", handle: "sundial" })],
      },
      generalSection: null,
      storeUrl: STORE_URL,
    })
    expect(out.subject).toBe("New releases from Tree House")
    expect(out.html).toContain("New releases from Tree House")
    expect(out.html).toContain("Also featuring Peacherine")
    expect(out.html).toContain("Julius")
    expect(out.html).toContain("Sundial")
  })

  it("hop-only lead (no brewery match) uses hop framing for heading/subject", async () => {
    const out = await renderEmail(NewDropDigest as any, {
      name: "Cam",
      brewerySection: null,
      hopSection: {
        label: "Citra",
        products: [product({ beerName: "Haze", breweryName: "Fidens" })],
      },
      generalSection: null,
      storeUrl: STORE_URL,
    })
    expect(out.subject).toBe("New drop: Haze")
    expect(out.html).toContain("New beers featuring Citra")
    expect(out.html).not.toContain("Also featuring")
  })

  it("general-only (generic fallback) uses generic framing, no section sub-heading", async () => {
    const out = await renderEmail(NewDropDigest as any, {
      name: "Cam",
      brewerySection: null,
      hopSection: null,
      generalSection: {
        products: [product({ beerName: "Haze" }), product({ beerName: "Green", handle: "g" })],
      },
      storeUrl: STORE_URL,
    })
    expect(out.subject).toBe("New drops just landed")
    expect(out.html).toContain("New drops just landed")
    expect(out.html).not.toContain("Other new drops")
  })

  it("general section as secondary (brewery lead, plus unrelated general items)", async () => {
    const out = await renderEmail(NewDropDigest as any, {
      name: "Cam",
      brewerySection: { label: "Tree House", products: [product({ beerName: "Julius" })] },
      hopSection: null,
      generalSection: { products: [product({ beerName: "Unrelated Lager", handle: "lager" })] },
      storeUrl: STORE_URL,
    })
    expect(out.html).toContain("Other new drops")
    expect(out.html).toContain("Unrelated Lager")
  })

  it("30 products across sections render successfully, all displayed, text variant exists", async () => {
    const products = Array.from({ length: 30 }, (_, i) =>
      product({ beerName: `Beer ${i}`, handle: `beer-${i}`, dispatchId: `d${i}` })
    )
    const out = await renderEmail(NewDropDigest as any, {
      name: "Cam",
      brewerySection: { label: "Tree House", products },
      hopSection: null,
      generalSection: null,
      storeUrl: STORE_URL,
    })
    expect(out.html).toContain("Beer 0")
    expect(out.html).toContain("Beer 29")
    expect(out.html).not.toContain("more release")
    expect(out.text.length).toBeGreaterThan(0)
    expect(Buffer.byteLength(out.html, "utf8")).toBeLessThan(90_000)
  })

  it("beyond 30 total: caps display, trims the lowest-priority section first, shows a 'more releases' link", async () => {
    const breweryProducts = Array.from({ length: 25 }, (_, i) =>
      product({ beerName: `Brewery Beer ${i}`, handle: `b-${i}`, dispatchId: `bd${i}` })
    )
    const hopProducts = Array.from({ length: 10 }, (_, i) =>
      product({ beerName: `Hop Beer ${i}`, handle: `h-${i}`, dispatchId: `hd${i}` })
    )
    const out = await renderEmail(NewDropDigest as any, {
      name: "Cam",
      brewerySection: { label: "Tree House", products: breweryProducts },
      hopSection: { label: "Citra", products: hopProducts },
      generalSection: null,
      storeUrl: STORE_URL,
    })
    // All 25 brewery beers survive (higher priority); only 5 of 10 hop beers fit in the remaining budget.
    expect(out.html).toContain("Brewery Beer 24")
    expect(out.html).toContain("Hop Beer 4")
    expect(out.html).not.toContain("Hop Beer 5")
    expect(out.html).toContain("Plus")
    expect(out.html).toContain("more release")
    expect(Buffer.byteLength(out.html, "utf8")).toBeLessThan(90_000)
  })

  it("missing image renders no broken <img> tag, falls back to text-only row", async () => {
    const out = await renderEmail(NewDropDigest as any, {
      name: "Cam",
      brewerySection: { label: "Tree House", products: [product({ image: null })] },
      hopSection: null,
      generalSection: null,
      storeUrl: STORE_URL,
    })
    expect(out.html).not.toContain("<img")
  })

  it("relative/non-absolute image URLs are treated as missing, not rendered", async () => {
    const out = await renderEmail(NewDropDigest as any, {
      name: "Cam",
      brewerySection: { label: "Tree House", products: [product({ image: "/relative/path.jpg" })] },
      hopSection: null,
      generalSection: null,
      storeUrl: STORE_URL,
    })
    expect(out.html).not.toContain("<img")
    expect(out.html).not.toContain("/relative/path.jpg")
  })

  it("preview text names the products for multi-product digests", async () => {
    const out = await renderEmail(NewDropDigest as any, {
      name: "Cam",
      brewerySection: null,
      hopSection: null,
      generalSection: {
        products: [
          product({ beerName: "Julius", handle: "a", dispatchId: "d1" }),
          product({ beerName: "Green", handle: "b", dispatchId: "d2" }),
          product({ beerName: "Haze", handle: "c", dispatchId: "d3" }),
        ],
      },
      storeUrl: STORE_URL,
    })
    expect(out.html).toContain("Julius, Green and 1 more just dropped")
  })
})
