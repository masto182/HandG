/**
 * Public site-config defaults — storefront fallback when /store/site-config/public is unreachable.
 *
 * Mirrors the `isPublic: true` keys + defaults from
 * apps/backend/src/modules/site-config/registry.ts
 *
 * If you add a new public key in the backend registry, update this file too.
 */

export type PublicSiteConfig = {
  payid_alias: string
  cash_pickup_enabled: boolean
  vip_early_access_offsets_hours: { vip1: number; vip2: number; vip3: number; vip4: number; vip5: number }
  site_name: string
  store_url: string
  tagline: string
  hero_copy_public: string
  hero_copy_member: string
  heat_hold_enabled: boolean
  shipping_heat_hold_message: string
  free_shipping_threshold_aud: number
}

export const PUBLIC_SITE_CONFIG_DEFAULTS: PublicSiteConfig = {
  payid_alias: "payments@example.com",
  cash_pickup_enabled: true,
  vip_early_access_offsets_hours: { vip1: 0, vip2: 6, vip3: 12, vip4: 24, vip5: 48 },
  site_name: "Example Store",
  store_url: "https://example.com",
  tagline: "Reference Store",
  hero_copy_public:
    "An invite-only collection of rare and ephemeral beer for serious collectors.",
  hero_copy_member: "Welcome back. Here's what's just landed.",
  heat_hold_enabled: false,
  shipping_heat_hold_message:
    "Forecast heat is high. Orders are queued and will dispatch on the next safe day.",
  free_shipping_threshold_aud: 0,
}
