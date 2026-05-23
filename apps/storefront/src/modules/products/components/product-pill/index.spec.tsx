import React from "react"
import { render, screen } from "@testing-library/react"
import ProductPill, { determinePillType } from "./index"

describe("ProductPill", () => {
  it("returns null for product with no special attributes", () => {
    const product = { metadata: {}, created_at: "2026-01-01T00:00:00Z" }
    expect(determinePillType(product)).toBeNull()
  })

  it("returns NEW for product created today", () => {
    const product = { metadata: {}, created_at: new Date().toISOString() }
    expect(determinePillType(product)).toBe("NEW")
  })

  it("returns NEW for product created 6 days ago", () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    const product = { metadata: {}, created_at: sixDaysAgo }
    expect(determinePillType(product)).toBe("NEW")
  })

  it("returns null for product created 8 days ago", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    const product = { metadata: {}, created_at: eightDaysAgo }
    expect(determinePillType(product)).toBeNull()
  })

  it("returns COLLAB for is_collab=true", () => {
    const product = { metadata: { is_collab: true }, created_at: "2026-01-01T00:00:00Z" }
    expect(determinePillType(product)).toBe("COLLAB")
  })

  it("returns ANNIVERSARY for product with anniversary tag", () => {
    const product = {
      metadata: { is_collab: true },
      created_at: "2026-01-01T00:00:00Z",
      tags: [{ id: "tag_1", value: "anniversary" }],
    }
    expect(determinePillType(product)).toBe("ANNIVERSARY")
  })

  it("ANNIVERSARY beats NEW (priority)", () => {
    const product = {
      metadata: {},
      created_at: new Date().toISOString(),
      tags: [{ id: "tag_1", value: "anniversary" }],
    }
    expect(determinePillType(product)).toBe("ANNIVERSARY")
  })

  it("EARLY ACCESS beats COLLAB when VIP tier qualifies", () => {
    const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    const product = {
      metadata: { is_collab: true, released_date: tomorrow },
      created_at: new Date().toISOString(),
    }
    expect(determinePillType(product, "vip5")).toBe("EARLY ACCESS")
  })

  it("does not show EARLY ACCESS without customerVipTier", () => {
    const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    const product = {
      metadata: { released_date: tomorrow },
      created_at: new Date().toISOString(),
    }
    expect(determinePillType(product)).toBe("NEW")
  })

  it("renders pill with correct testid", () => {
    const product = { metadata: { is_collab: true }, created_at: "2026-01-01T00:00:00Z" }
    render(<ProductPill product={product} />)
    expect(screen.getByTestId("product-pill")).toBeInTheDocument()
    expect(screen.getByText("Collab")).toBeInTheDocument()
  })

  it("renders nothing when no pill type matches", () => {
    const product = { metadata: {}, created_at: "2026-01-01T00:00:00Z" }
    const { container } = render(<ProductPill product={product} />)
    expect(container.firstChild).toBeNull()
  })
})
