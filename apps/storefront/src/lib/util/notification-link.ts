export type NotificationLinkMetadata = {
  handle?: string
  cta?: string
  link_url?: string
  link_text?: string
} | null

const CTA_LABELS: Record<string, string> = {
  tier_upgrade: "View VIP Status",
  welcome: "Get Started",
  onboarding_halfway: "Continue Setup",
  referral_signup: "View Referrals",
}

export function getNotificationLink(item: {
  type: string
  metadata?: NotificationLinkMetadata
}): { href: string; label: string } | null {
  const metadata = item.metadata

  if (item.type === "broadcast" && metadata?.link_url) {
    return {
      href: metadata.link_url,
      label: metadata.link_text || "Learn more",
    }
  }

  if (
    (item.type === "new_drop" || item.type === "wishlist_match") &&
    metadata?.handle
  ) {
    return { href: `/products/${metadata.handle}`, label: "View Product" }
  }

  if (metadata?.cta) {
    return { href: metadata.cta, label: CTA_LABELS[item.type] || "View" }
  }

  return null
}
