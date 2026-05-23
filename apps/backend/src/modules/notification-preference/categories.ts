import type { NotificationCategory } from "../../lib/email"

export type CategoryDefinition = {
  category: NotificationCategory
  label: string
  description: string
  /** Transactional categories cannot be opted out of. */
  transactional: boolean
  /** Display order in the storefront preferences UI. */
  order: number
}

export const NOTIFICATION_CATEGORIES: ReadonlyArray<CategoryDefinition> = [
  {
    category: "applications",
    label: "Application Updates",
    description:
      "Status updates on your Hops & Glory membership application.",
    transactional: true,
    order: 0,
  },
  {
    category: "orders",
    label: "Order Updates",
    description:
      "Order confirmation, payment, shipping, and pickup notifications.",
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
    description:
      "Get notified when a beer you've subscribed to is back in stock.",
    transactional: false,
    order: 3,
  },
  {
    category: "vip_progression",
    label: "VIP Status",
    description:
      "Tier promotions, demotion warnings, and VIP-only release alerts.",
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
    description:
      "Alerts when a buy-at-price offer you submitted has been accepted.",
    transactional: false,
    order: 6,
  },
]

export const TRANSACTIONAL_CATEGORIES: ReadonlySet<NotificationCategory> =
  new Set(
    NOTIFICATION_CATEGORIES.filter((c) => c.transactional).map(
      (c) => c.category
    )
  )

export function isTransactional(category: NotificationCategory): boolean {
  return TRANSACTIONAL_CATEGORIES.has(category)
}

export function isKnownCategory(value: string): value is NotificationCategory {
  return NOTIFICATION_CATEGORIES.some((c) => c.category === value)
}
