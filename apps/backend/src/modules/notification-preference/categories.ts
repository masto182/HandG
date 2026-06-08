import type { NotificationCategory } from "../../lib/email"

export type CategoryDefinition = {
  category: NotificationCategory
  label: string
  description: string
  /** Transactional categories cannot be opted out of. */
  transactional: boolean
  /** Display order in the storefront preferences UI. */
  order: number
  /**
   * Whether a customer is considered opted-in when no explicit row exists.
   * Defaults to `true` for most marketing categories.
   * Set to `false` for categories that require explicit opt-in (e.g. new_drops,
   * hop_alerts) so the UI shows them as off until the customer actively enables.
   */
  default_enabled?: boolean
}

export const NOTIFICATION_CATEGORIES: ReadonlyArray<CategoryDefinition> = [
  {
    category: "applications",
    label: "Application Updates",
    description: "Status updates on your Hops & Glory membership application.",
    transactional: true,
    order: 0,
  },
  {
    category: "orders",
    label: "Order Updates",
    description: "Order confirmation, payment, shipping, and pickup notifications.",
    transactional: true,
    order: 1,
  },
  {
    category: "account",
    label: "Account Security",
    description:
      "Email change confirmations, password updates, and other account security notifications.",
    transactional: true,
    order: 2,
  },
  {
    category: "restock_alerts",
    label: "Restock Alerts",
    description: "Get notified when a beer you've subscribed to is back in stock.",
    transactional: false,
    order: 3,
  },
  {
    category: "vip_progression",
    label: "VIP Status",
    description: "Tier promotions, demotion warnings, and VIP-only release alerts.",
    transactional: false,
    order: 4,
  },
  {
    category: "referrals",
    label: "Referral Rewards",
    description: "Notifications when one of your referrals earns you credit.",
    transactional: false,
    order: 5,
  },
  {
    category: "wishlist_offers",
    label: "Wishlist Offers",
    description: "Alerts when a buy-at-price offer you submitted has been accepted.",
    transactional: false,
    order: 6,
  },
  {
    category: "brewery_releases",
    label: "Brewery Alerts",
    description: "Get notified when a brewery you follow adds a new release.",
    transactional: false,
    order: 7,
  },
  {
    category: "new_drops",
    label: "All New Releases",
    description: "Get alerted by email the moment any new beer drops.",
    transactional: false,
    order: 8,
    default_enabled: false,
  },
  {
    category: "hop_alerts",
    label: "Hop Alerts",
    description: "Get notified of new releases featuring a hop you follow.",
    transactional: false,
    order: 9,
    default_enabled: false,
  },
]

export const TRANSACTIONAL_CATEGORIES: ReadonlySet<NotificationCategory> = new Set(
  NOTIFICATION_CATEGORIES.filter((c) => c.transactional).map((c) => c.category)
)

export function isTransactional(category: NotificationCategory): boolean {
  return TRANSACTIONAL_CATEGORIES.has(category)
}

export function isKnownCategory(value: string): value is NotificationCategory {
  return NOTIFICATION_CATEGORIES.some((c) => c.category === value)
}
