import { getNotificationLink } from "./notification-link"

describe("getNotificationLink", () => {
  it("uses broadcast link_url", () => {
    expect(
      getNotificationLink({
        type: "broadcast",
        metadata: { link_url: "/store?sortBy=created_at", link_text: "See it" },
      }),
    ).toEqual({ href: "/store?sortBy=created_at", label: "See it" })
  })

  it("prefers new_drop batch link_url over the legacy handle branch", () => {
    expect(
      getNotificationLink({
        type: "new_drop",
        metadata: {
          link_url: "/store?brewery=Tree+House&sortBy=created_at",
          handle: "should-not-be-used",
        },
      }),
    ).toEqual({
      href: "/store?brewery=Tree+House&sortBy=created_at",
      label: "View New Drops",
    })
  })

  it("falls back to the legacy single-product handle when no link_url is present", () => {
    expect(
      getNotificationLink({
        type: "new_drop",
        metadata: { handle: "tree-house-julius" },
      }),
    ).toEqual({ href: "/products/tree-house-julius", label: "View Product" })
  })

  it("wishlist_match still uses the handle branch (unaffected by the new_drop change)", () => {
    expect(
      getNotificationLink({
        type: "wishlist_match",
        metadata: { handle: "cantillon-gueuze" },
      }),
    ).toEqual({ href: "/products/cantillon-gueuze", label: "View Product" })
  })

  it("falls back to cta for other types", () => {
    expect(
      getNotificationLink({
        type: "tier_upgrade",
        metadata: { cta: "/account/vip" },
      }),
    ).toEqual({ href: "/account/vip", label: "View VIP Status" })
  })

  it("returns null when nothing matches", () => {
    expect(getNotificationLink({ type: "new_drop", metadata: null })).toBeNull()
  })
})
