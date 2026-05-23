/**
 * Site configuration registry.
 *
 * SECURITY: keys with `isPublic: true` are returned by an unauthenticated
 * `GET /store/site-config/public` endpoint. NEVER add a key here with
 * `isPublic: true` if it contains:
 *   - credentials, API keys, or secrets
 *   - bank account numbers, BSBs, or other payment instruments beyond an alias
 *   - private identifiers (admin emails, internal URLs)
 *   - PII of any kind
 *
 * If you are unsure whether a value is safe to expose, default to `isPublic: false`.
 *
 * Resolution order in SiteConfigService.get(key):
 *   1. site_config table row (admin override)
 *   2. process.env[envVar] (if registry definition has envVar)
 *   3. registry default
 */

export type SiteConfigType = "string" | "number" | "boolean" | "json"

export type SiteConfigDefinition = {
  key: string
  type: SiteConfigType
  isPublic: boolean
  envVar?: string
  default: unknown
  group: "payments" | "vip" | "email" | "branding" | "shipping"
  label: string
  description: string
  validate?: (value: unknown) => string | null
}

const requireString = (value: unknown): string | null => {
  if (typeof value !== "string") return "must be a string"
  if (value.trim().length === 0) return "must be non-empty"
  return null
}

const requireNumber = (min?: number, max?: number) => (value: unknown): string | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "must be a finite number"
  if (min !== undefined && value < min) return `must be >= ${min}`
  if (max !== undefined && value > max) return `must be <= ${max}`
  return null
}

const requireBoolean = (value: unknown): string | null => {
  return typeof value === "boolean" ? null : "must be a boolean"
}

const requireObject = (value: unknown): string | null => {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? null
    : "must be a JSON object"
}

const requireEmail = (value: unknown): string | null => {
  const stringErr = requireString(value)
  if (stringErr) return stringErr
  // Lenient: accept "Display <addr@example.com>" or bare "addr@example.com"
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value as string) ? null : "must contain a valid email"
}

export const SITE_CONFIG_REGISTRY: Record<string, SiteConfigDefinition> = {
  // ---------- payments ----------
  payid_alias: {
    key: "payid_alias",
    type: "string",
    isPublic: true,
    envVar: "NEXT_PUBLIC_PAYID_ALIAS",
    default: "payments@example.com",
    group: "payments",
    label: "PayID alias",
    description: "PayID identifier customers send bank transfers to. Public — shown at checkout.",
    validate: requireString,
  },
  payid_hold_hours: {
    key: "payid_hold_hours",
    type: "number",
    isPublic: false,
    default: 24,
    group: "payments",
    label: "PayID hold window (hours)",
    description: "Backend cancels unpaid PayID orders after this many hours.",
    validate: requireNumber(1, 168),
  },
  cash_pickup_enabled: {
    key: "cash_pickup_enabled",
    type: "boolean",
    isPublic: true,
    default: true,
    group: "payments",
    label: "Cash on pickup enabled",
    description: "Allows pickup orders to choose cash on collection.",
    validate: requireBoolean,
  },

  // ---------- vip ----------
  vip_thresholds: {
    key: "vip_thresholds",
    type: "json",
    isPublic: false,
    default: { vip1: 100, vip2: 250, vip3: 450, vip4: 700, vip5: 1000 },
    group: "vip",
    label: "VIP score thresholds",
    description: "Score required for each tier. Internal only.",
    validate: (value) => {
      const objErr = requireObject(value)
      if (objErr) return objErr
      const v = value as Record<string, unknown>
      for (const tier of ["vip1", "vip2", "vip3", "vip4", "vip5"]) {
        if (typeof v[tier] !== "number" || (v[tier] as number) <= 0) {
          return `${tier} must be a positive number`
        }
      }
      return null
    },
  },
  vip_direct_multiplier: {
    key: "vip_direct_multiplier",
    type: "number",
    isPublic: false,
    default: 0.2,
    group: "vip",
    label: "VIP direct referral multiplier",
    description: "Score weight applied to direct referral spend.",
    validate: requireNumber(0, 5),
  },
  vip_indirect_multiplier: {
    key: "vip_indirect_multiplier",
    type: "number",
    isPublic: false,
    default: 0.1,
    group: "vip",
    label: "VIP indirect referral multiplier",
    description: "Score weight applied to second-degree referral spend.",
    validate: requireNumber(0, 5),
  },
  vip_demotion_grace_days: {
    key: "vip_demotion_grace_days",
    type: "number",
    isPublic: false,
    default: 30,
    group: "vip",
    label: "VIP demotion grace (days)",
    description: "Days a member can stay in their tier after dropping below the threshold.",
    validate: requireNumber(0, 365),
  },
  vip_rolling_window_months: {
    key: "vip_rolling_window_months",
    type: "number",
    isPublic: false,
    default: 3,
    group: "vip",
    label: "VIP rolling window (months)",
    description: "How far back orders count toward VIP score.",
    validate: requireNumber(1, 24),
  },
  vip_early_access_offsets_hours: {
    key: "vip_early_access_offsets_hours",
    type: "json",
    isPublic: true,
    default: { vip1: 0, vip2: 6, vip3: 12, vip4: 24, vip5: 48 },
    group: "vip",
    label: "Early-access offsets per tier (hours)",
    description: "Hours before public release that each tier can buy.",
    validate: (value) => {
      const objErr = requireObject(value)
      if (objErr) return objErr
      const v = value as Record<string, unknown>
      for (const tier of ["vip1", "vip2", "vip3", "vip4", "vip5"]) {
        if (typeof v[tier] !== "number" || (v[tier] as number) < 0) {
          return `${tier} must be a non-negative number`
        }
      }
      return null
    },
  },

  // ---------- email ----------
  email_from: {
    key: "email_from",
    type: "string",
    isPublic: false,
    envVar: "EMAIL_FROM",
    default: "Example Store <noreply@example.com>",
    group: "email",
    label: "From address",
    description: "Sender for all transactional email.",
    validate: requireString,
  },
  email_orders_to: {
    key: "email_orders_to",
    type: "string",
    isPublic: false,
    default: "orders@example.com",
    group: "email",
    label: "Orders inbox",
    description: "Where order admin notifications are sent.",
    validate: requireEmail,
  },
  email_alerts_to: {
    key: "email_alerts_to",
    type: "string",
    isPublic: false,
    default: "alerts@example.com",
    group: "email",
    label: "Alerts inbox",
    description: "Where stock and ops alerts are sent.",
    validate: requireEmail,
  },
  email_payments_to: {
    key: "email_payments_to",
    type: "string",
    isPublic: false,
    default: "payments@example.com",
    group: "email",
    label: "Payments inbox",
    description: "Where PayID confirmations are routed.",
    validate: requireEmail,
  },
  email_hello_to: {
    key: "email_hello_to",
    type: "string",
    isPublic: false,
    default: "hello@example.com",
    group: "email",
    label: "General inbox",
    description: "Public contact address.",
    validate: requireEmail,
  },

  // ---------- branding ----------
  site_name: {
    key: "site_name",
    type: "string",
    isPublic: true,
    default: "Example Store",
    group: "branding",
    label: "Site name",
    description: "Brand name shown across the storefront.",
    validate: requireString,
  },
  store_url: {
    key: "store_url",
    type: "string",
    isPublic: true,
    envVar: "STORE_URL",
    default: "https://example.com",
    group: "branding",
    label: "Store URL",
    description: "Canonical storefront URL used in emails and referral links.",
    validate: requireString,
  },
  tagline: {
    key: "tagline",
    type: "string",
    isPublic: true,
    default: "Reference Store",
    group: "branding",
    label: "Tagline",
    description: "Short tagline shown in hero / OG metadata.",
    validate: requireString,
  },
  hero_copy_public: {
    key: "hero_copy_public",
    type: "string",
    isPublic: true,
    default: "An invite-only collection of rare and ephemeral beer for serious collectors.",
    group: "branding",
    label: "Hero copy (non-members)",
    description: "Body text on the homepage hero for unauthenticated visitors.",
    validate: requireString,
  },
  hero_copy_member: {
    key: "hero_copy_member",
    type: "string",
    isPublic: true,
    default: "Welcome back. Here's what's just landed.",
    group: "branding",
    label: "Hero copy (members)",
    description: "Body text on the homepage hero for approved members.",
    validate: requireString,
  },

  // ---------- shipping (Sprint 8 - ShipEngine) ----------
  heat_hold_enabled: {
    key: "heat_hold_enabled",
    type: "boolean",
    isPublic: true,
    default: false,
    group: "shipping",
    label: "Heat-hold enabled",
    description: "When true, shipments are blocked from dispatch until toggled off or per-order override is set. Public so checkout banner reads without auth.",
    validate: requireBoolean,
  },
  shipping_heat_hold_message: {
    key: "shipping_heat_hold_message",
    type: "string",
    isPublic: true,
    default: "Forecast heat is high. Orders are queued and will dispatch on the next safe day.",
    group: "shipping",
    label: "Heat-hold checkout message",
    description: "Shown above the place-order button when heat hold is active.",
    validate: requireString,
  },
  free_shipping_threshold_aud: {
    key: "free_shipping_threshold_aud",
    type: "number",
    isPublic: true,
    default: 0,
    group: "shipping",
    label: "Free shipping threshold (AUD)",
    description: "Cart subtotal at which shipping becomes free. 0 disables.",
    validate: requireNumber(0, 10000),
  },
  shipping_from_name: {
    key: "shipping_from_name",
    type: "string",
    isPublic: false,
    default: "Example Store",
    group: "shipping",
    label: "Ship-from name",
    description: "Sender name printed on labels.",
    validate: requireString,
  },
  shipping_from_phone: {
    key: "shipping_from_phone",
    type: "string",
    isPublic: false,
    default: "+61 0 0000 0000",
    group: "shipping",
    label: "Ship-from phone",
    description: "Sender contact number on labels (E.164 preferred).",
    validate: requireString,
  },
  shipping_from_address_1: {
    key: "shipping_from_address_1",
    type: "string",
    isPublic: false,
    default: "1 Hillside Lane",
    group: "shipping",
    label: "Ship-from street",
    description: "Sender street address printed on labels.",
    validate: requireString,
  },
  shipping_from_city: {
    key: "shipping_from_city",
    type: "string",
    isPublic: false,
    default: "Sydney",
    group: "shipping",
    label: "Ship-from city",
    description: "Sender city.",
    validate: requireString,
  },
  shipping_from_state: {
    key: "shipping_from_state",
    type: "string",
    isPublic: false,
    default: "NSW",
    group: "shipping",
    label: "Ship-from state",
    description: "Sender state/territory (NSW, VIC, QLD, SA, WA, TAS, ACT, NT).",
    validate: (value) => {
      const stringErr = requireString(value)
      if (stringErr) return stringErr
      const allowed = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"]
      return allowed.includes((value as string).toUpperCase()) ? null : `must be one of ${allowed.join(", ")}`
    },
  },
  shipping_from_postcode: {
    key: "shipping_from_postcode",
    type: "string",
    isPublic: false,
    default: "2000",
    group: "shipping",
    label: "Ship-from postcode",
    description: "Sender postcode (4 digits, AU).",
    validate: (value) => {
      const stringErr = requireString(value)
      if (stringErr) return stringErr
      return /^\d{4}$/.test(value as string) ? null : "must be a 4-digit AU postcode"
    },
  },
  shipping_from_country: {
    key: "shipping_from_country",
    type: "string",
    isPublic: false,
    default: "AU",
    group: "shipping",
    label: "Ship-from country",
    description: "ISO-3166 alpha-2 country code.",
    validate: requireString,
  },
  shipengine_carrier_ids: {
    key: "shipengine_carrier_ids",
    type: "json",
    isPublic: false,
    default: [],
    group: "shipping",
    label: "ShipEngine carrier IDs",
    description: "Array of carrier_id (se-XXXX) values to query for rates. Use the admin Refresh Carriers button to populate.",
    validate: (value) => {
      if (!Array.isArray(value)) return "must be a JSON array"
      for (const v of value) {
        if (typeof v !== "string" || v.trim().length === 0) return "every carrier_id must be a non-empty string"
      }
      return null
    },
  },
  shipping_default_item_weight_g: {
    key: "shipping_default_item_weight_g",
    type: "number",
    isPublic: false,
    default: 750,
    group: "shipping",
    label: "Default item weight (grams)",
    description: "Fallback per-line-item weight when product/variant weight is missing.",
    validate: requireNumber(50, 50000),
  },
  shipping_validate_address_mode: {
    key: "shipping_validate_address_mode",
    type: "string",
    isPublic: false,
    default: "validate_and_clean",
    group: "shipping",
    label: "Inline address validation mode",
    description: "ShipEngine validate_address mode for /v1/rates and /v1/labels (no_validation | validate_only | validate_and_clean).",
    validate: (value) => {
      const stringErr = requireString(value)
      if (stringErr) return stringErr
      const allowed = ["no_validation", "validate_only", "validate_and_clean"]
      return allowed.includes(value as string) ? null : `must be one of ${allowed.join(", ")}`
    },
  },
  auto_pick_cheapest_label: {
    key: "auto_pick_cheapest_label",
    type: "boolean",
    isPublic: false,
    default: true,
    group: "shipping",
    label: "Auto-pick cheapest carrier at fulfillment",
    description: "When true, ready-to-ship re-runs /v1/rates and uses the cheapest live option, ignoring the customer's checkout choice. Customer's choice is recorded in fulfillment metadata for transparency.",
    validate: requireBoolean,
  },
  // ---------- shipping (AusPost PAC) ----------
  auspost_enabled: {
    key: "auspost_enabled",
    type: "boolean",
    isPublic: false,
    default: false,
    group: "shipping",
    label: "AusPost PAC enabled",
    description: "Master switch for the AusPost fulfillment provider. When false, AusPost rates are silently omitted from /store/shipping/rates.",
    validate: requireBoolean,
  },
  auspost_mode: {
    key: "auspost_mode",
    type: "string",
    isPublic: false,
    default: "production",
    group: "shipping",
    label: "AusPost API mode",
    description: "PAC test endpoint was retired - 'production' hits digitalapi.auspost.com.au. Kept here for future re-introduction of a test path.",
    validate: (value) => {
      const stringErr = requireString(value)
      if (stringErr) return stringErr
      const allowed = ["production", "test"]
      return allowed.includes(value as string) ? null : `must be one of ${allowed.join(", ")}`
    },
  },
  auspost_api_key: {
    key: "auspost_api_key",
    type: "string",
    isPublic: false,
    envVar: "AUSPOST_API_KEY",
    default: "",
    group: "shipping",
    label: "AusPost PAC API key",
    description: "AUTH-KEY from https://developers.auspost.com.au/apis/pacpcs-registration. Empty value disables live mode and uses the deterministic stub.",
    validate: (value) => {
      if (typeof value !== "string") return "must be a string"
      return null // empty is OK - falls back to stub
    },
  },
  auspost_services_enabled: {
    key: "auspost_services_enabled",
    type: "json",
    isPublic: false,
    default: ["AUS_PARCEL_REGULAR", "AUS_PARCEL_EXPRESS"],
    group: "shipping",
    label: "AusPost services enabled",
    description: "PAC service codes to surface at checkout. Currently only AUS_PARCEL_REGULAR and AUS_PARCEL_EXPRESS supported.",
    validate: (value) => {
      if (!Array.isArray(value)) return "must be a JSON array"
      const allowed = ["AUS_PARCEL_REGULAR", "AUS_PARCEL_EXPRESS"]
      for (const v of value) {
        if (typeof v !== "string" || !allowed.includes(v)) {
          return `every service must be one of ${allowed.join(", ")}`
        }
      }
      return null
    },
  },
  auspost_discount_pct_standard: {
    key: "auspost_discount_pct_standard",
    type: "number",
    isPublic: false,
    default: 0,
    group: "shipping",
    label: "AusPost Standard discount (%)",
    description: "Percentage off PAC retail price for Parcel Post shown to customer. Applied to base rate only - SOD and Extra Cover surcharges pass through at cost. 0 = pass-through RRP.",
    validate: requireNumber(0, 95),
  },
  auspost_discount_pct_express: {
    key: "auspost_discount_pct_express",
    type: "number",
    isPublic: false,
    default: 0,
    group: "shipping",
    label: "AusPost Express discount (%)",
    description: "Percentage off PAC retail price for Express Post shown to customer. Applied to base rate only.",
    validate: requireNumber(0, 95),
  },
  auspost_extra_cover_threshold_aud: {
    key: "auspost_extra_cover_threshold_aud",
    type: "number",
    isPublic: false,
    default: 200,
    group: "shipping",
    label: "AusPost Extra Cover threshold (AUD)",
    description: "Auto-add Extra Cover when cart subtotal >= this value.",
    validate: requireNumber(0, 5000),
  },
  auspost_sod_trigger_aud: {
    key: "auspost_sod_trigger_aud",
    type: "number",
    isPublic: false,
    default: 300,
    group: "shipping",
    label: "AusPost SOD trigger (AUD)",
    description: "Auto-add Signature on Delivery when cart subtotal exceeds this value, lifting the Extra Cover cap from $500 to $5,000.",
    validate: requireNumber(0, 5000),
  },

  // ---------- shipping (v2 redesign - WI-35) ----------
  shipping_dedup_within_carrier: {
    key: "shipping_dedup_within_carrier",
    type: "boolean",
    isPublic: false,
    default: true,
    group: "shipping",
    label: "Dedup within carrier",
    description: "When true, /store/shipping/rates returns at most one rate per (carrier, service_tier, delivery_behaviour) - the cheapest. Keeps the carrier-grouped checkout UI clean.",
    validate: requireBoolean,
  },
  shipping_carrier_order: {
    key: "shipping_carrier_order",
    type: "json",
    isPublic: false,
    default: ["australia_post", "aramex", "couriers_please"],
    group: "shipping",
    label: "Carrier display order",
    description: "Order carrier groups appear in checkout (left-to-right or top-to-bottom). Items not listed appear after, alphabetically.",
    validate: (value) => {
      if (!Array.isArray(value)) return "must be a JSON array"
      const allowed = ["australia_post", "aramex", "couriers_please", "other"]
      for (const v of value) {
        if (typeof v !== "string" || !allowed.includes(v)) {
          return `every entry must be one of ${allowed.join(", ")}`
        }
      }
      return null
    },
  },
  shipping_signature_recommended_threshold_aud: {
    key: "shipping_signature_recommended_threshold_aud",
    type: "number",
    isPublic: true,
    default: 300,
    group: "shipping",
    label: "Signature recommended threshold (AUD)",
    description: "Above this subtotal, the storefront auto-ticks the Require signature checkbox and shows a (recommended) suffix. Public so storefront can read without auth.",
    validate: requireNumber(0, 5000),
  },

  rate_comparison_sample_addresses: {
    key: "rate_comparison_sample_addresses",
    type: "json",
    isPublic: false,
    default: [
      { label: "Melbourne metro", postcode: "3000", state: "VIC", weight_g: 1500 },
      { label: "Sydney metro", postcode: "2000", state: "NSW", weight_g: 1500 },
      { label: "Regional VIC (Bendigo)", postcode: "3550", state: "VIC", weight_g: 1500 },
      { label: "Regional NSW (Wagga)", postcode: "2650", state: "NSW", weight_g: 1500 },
    ],
    group: "shipping",
    label: "Rate-comparison sample addresses",
    description: "Sample shipments the weekly rate-comparison cron quotes against each carrier.",
    validate: (value) => {
      if (!Array.isArray(value)) return "must be a JSON array"
      for (const item of value) {
        if (!item || typeof item !== "object") return "every item must be an object"
        const obj = item as Record<string, unknown>
        if (typeof obj.label !== "string" || typeof obj.postcode !== "string" || typeof obj.state !== "string" || typeof obj.weight_g !== "number") {
          return "every item must have label (string), postcode (string), state (string), weight_g (number)"
        }
      }
      return null
    },
  },
}

export type SiteConfigKey = keyof typeof SITE_CONFIG_REGISTRY
export type PublicSiteConfigKey = {
  [K in keyof typeof SITE_CONFIG_REGISTRY]: typeof SITE_CONFIG_REGISTRY[K]["isPublic"] extends true ? K : never
}[keyof typeof SITE_CONFIG_REGISTRY]

export const PUBLIC_SITE_CONFIG_KEYS: SiteConfigKey[] = Object.values(SITE_CONFIG_REGISTRY)
  .filter((d) => d.isPublic)
  .map((d) => d.key as SiteConfigKey)

/**
 * Coerce a raw env-var string to the registry-declared type.
 * Returns the coerced value, or the original string if coercion fails (validator will reject).
 */
export function coerceEnvValue(type: SiteConfigType, raw: string): unknown {
  switch (type) {
    case "string":
      return raw
    case "number": {
      const n = Number(raw)
      return Number.isFinite(n) ? n : raw
    }
    case "boolean": {
      const lower = raw.toLowerCase()
      if (lower === "true" || lower === "1" || lower === "yes") return true
      if (lower === "false" || lower === "0" || lower === "no") return false
      return raw
    }
    case "json": {
      try {
        return JSON.parse(raw)
      } catch {
        return raw
      }
    }
  }
}
