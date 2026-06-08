"use client"

import { useEffect, useMemo, useState } from "react"
import {
  canCustomerAccessProduct,
  computeTierVisibleFrom,
  currentLowestTierWithAccess,
  HOURS_BEFORE_PUBLIC_BY_TIER,
  type Tier,
} from "@lib/access/early-access"

type Props = {
  /** ISO string or Date when the product first becomes purchasable (VIP4/VIP5 unlock). */
  releaseAt?: string | Date | null
  /**
   * Legacy field; if no releaseAt is supplied we derive releaseAt = earlyAccessUntil − 24h
   * so existing callers that only pass earlyAccessUntil keep working.
   */
  earlyAccessUntil?: string | Date | null
  /** Per-tier "hours before public" offsets resolved at request time. Falls back to static defaults. */
  offsets?: typeof HOURS_BEFORE_PUBLIC_BY_TIER
  /** Viewer's current tier. Anonymous viewers must pass null. */
  viewerTier: Tier | null
  className?: string
}

const TIER_LABEL: Record<Tier, string> = {
  vip5: "VIP5",
  vip4: "VIP4",
  vip3: "VIP3",
  vip2: "VIP2",
  vip1: "VIP1",
  approved: "members",
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "now"
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * Live countdown shown on product card / PDP when the logged-in viewer cannot
 * yet purchase the product (their tier window has not opened). Anonymous
 * viewers (viewerTier === null) get nothing — they see the existing redacted
 * card UX like every other product.
 *
 * Backend cart-add is the authoritative gate; this is UI advisory only.
 */
export default function EarlyAccessCountdown({
  releaseAt,
  earlyAccessUntil,
  offsets,
  viewerTier,
  className,
}: Props) {
  const tierOffsets = offsets ?? HOURS_BEFORE_PUBLIC_BY_TIER

  const release = useMemo(() => {
    if (releaseAt) {
      const d = new Date(releaseAt)
      return isNaN(d.getTime()) ? null : d
    }
    if (earlyAccessUntil) {
      const d = new Date(earlyAccessUntil)
      if (isNaN(d.getTime())) return null
      // Legacy: derive release_at from the public-access window.
      return new Date(d.getTime() - 24 * 3600 * 1000)
    }
    return null
  }, [releaseAt, earlyAccessUntil])

  const publicAccess = useMemo(() => {
    return release ? new Date(release.getTime() + 24 * 3600 * 1000) : null
  }, [release])

  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    if (!release) return
    const interval = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [release])

  if (!release || !publicAccess) return null
  if (!viewerTier) return null
  if (canCustomerAccessProduct(viewerTier, publicAccess, now)) return null

  const visibleFrom = computeTierVisibleFrom(publicAccess, viewerTier)
  const remainingMs = visibleFrom.getTime() - now.getTime()
  if (remainingMs <= 0) return null

  const lowest = currentLowestTierWithAccess(release, tierOffsets, now)
  const lowestLabel = lowest ? TIER_LABEL[lowest] : TIER_LABEL.vip5

  return (
    <div
      className={className || "text-xs text-hg-text-secondary leading-relaxed"}
    >
      <div>
        Currently available to{" "}
        <span className="font-semibold text-hg-gold">{lowestLabel}</span> and
        above.
      </div>
      <div>
        You'll be able to purchase in{" "}
        <span className="font-semibold">{formatCountdown(remainingMs)}</span>.
      </div>
    </div>
  )
}
