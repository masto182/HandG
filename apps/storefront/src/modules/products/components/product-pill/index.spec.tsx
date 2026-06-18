import React from "react"
import { render, screen } from "@testing-library/react"
import ProductPill, { determinePillTypes } from "./index"

describe("ProductPill", () => {
  it("returns [] for product with no special attributes", () => {
    const product = { metadata: {}, created_at: "2026-01-01T00:00:00Z" }
    expect(determinePillTypes(product)).toEqual([])
  })

  it("returns NEW for product created today", () => {
    const product = { metadata: {}, created_at: new Date().toISOString() }
    expect(determinePillTypes(product)).toEqual(["NEW"])
  })

  it("returns NEW for product created 6 days ago", () => {
    const sixDaysAgo = new Date(
      Date.now() - 6 * 24 * 60 * 60 * 1000,
    ).toISOString()
    const product = { metadata: {}, created_at: sixDaysAgo }
    expect(determinePillTypes(product)).toEqual(["NEW"])
  })

  it("returns [] for product created 8 days ago", () => {
    const eightDaysAgo = new Date(
      Date.now() - 8 * 24 * 60 * 60 * 1000,
    ).toISOString()
    const product = { metadata: {}, created_at: eightDaysAgo }
    expect(determinePillTypes(product)).toEqual([])
  })

  it("returns COLLAB for product with multiple linked breweries", () => {
    const product = {
      metadata: { brewery_slug: "range" },
      created_at: "2026-01-01T00:00:00Z",
      breweries: [{ slug: "range" }, { slug: "hop-nation" }],
    }
    expect(determinePillTypes(product)).toEqual(["COLLAB"])
  })

  it("does NOT return COLLAB when only one brewery is linked", () => {
    const product = {
      metadata: { brewery_slug: "range" },
      created_at: "2026-01-01T00:00:00Z",
      breweries: [{ slug: "range" }],
    }
    expect(determinePillTypes(product)).toEqual([])
  })

  it("returns ANNIVERSARY and COLLAB together when anniversary tag and multiple breweries", () => {
    const product = {
      metadata: {},
      created_at: "2026-01-01T00:00:00Z",
      breweries: [{ slug: "a" }, { slug: "b" }],
      tags: [{ id: "tag_1", value: "anniversary" }],
    }
    expect(determinePillTypes(product)).toEqual(["ANNIVERSARY", "COLLAB"])
  })

  it("returns only ANNIVERSARY when anniversary tag but single brewery", () => {
    const product = {
      metadata: {},
      created_at: new Date().toISOString(),
      tags: [{ id: "tag_1", value: "anniversary" }],
    }
    expect(determinePillTypes(product)).toEqual(["ANNIVERSARY"])
  })

  it("ANNIVERSARY suppresses NEW (no NEW when characteristics present)", () => {
    const product = {
      metadata: {},
      created_at: new Date().toISOString(),
      tags: [{ id: "tag_1", value: "anniversary" }],
    }
    expect(determinePillTypes(product)).toEqual(["ANNIVERSARY"])
  })

  it("EARLY ACCESS beats COLLAB when VIP tier qualifies", () => {
    const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    const product = {
      metadata: { released_date: tomorrow },
      created_at: new Date().toISOString(),
      breweries: [{ slug: "a" }, { slug: "b" }],
    }
    expect(determinePillTypes(product, "vip5")).toEqual(["EARLY ACCESS"])
  })

  it("does not show EARLY ACCESS without customerVipTier", () => {
    const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    const product = {
      metadata: { released_date: tomorrow },
      created_at: new Date().toISOString(),
    }
    expect(determinePillTypes(product)).toEqual(["NEW"])
  })

  it("renders pill wrapper with correct testid", () => {
    const product = {
      metadata: { brewery_slug: "range" },
      created_at: "2026-01-01T00:00:00Z",
      breweries: [{ slug: "range" }, { slug: "hop-nation" }],
    }
    render(<ProductPill product={product} />)
    expect(screen.getByTestId("product-pill")).toBeInTheDocument()
    expect(screen.getByText("Collab")).toBeInTheDocument()
  })

  it("renders nothing when no pill type matches", () => {
    const product = { metadata: {}, created_at: "2026-01-01T00:00:00Z" }
    const { container } = render(<ProductPill product={product} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders two pills when ANNIVERSARY and COLLAB both apply", () => {
    const product = {
      metadata: {},
      created_at: "2026-01-01T00:00:00Z",
      breweries: [{ slug: "a" }, { slug: "b" }],
      tags: [{ id: "tag_1", value: "anniversary" }],
    }
    render(<ProductPill product={product} />)
    expect(screen.getByText("Anniversary")).toBeInTheDocument()
    expect(screen.getByText("Collab")).toBeInTheDocument()
  })
})
