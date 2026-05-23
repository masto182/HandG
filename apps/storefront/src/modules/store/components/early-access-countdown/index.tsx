"use client"

import { useEffect, useMemo, useState } from "react"
import {
  canCustomerAccessProduct,
  computeTierVisibleFrom,
  nextTierForEarlierAccess,
  type Tier,
} from "@lib/access/early-access"

type Props = {
  earlyAccessUntil?: string | Date | null
  tier: Tier | null
  className?: string
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
 * Live countdown shown on product card / PDP when the viewer cannot yet
 * access the product. Also hints at the next tier that would unlock it
 * sooner, as an upsell.
 *
 * Real enforcement happens on the backend cart-add gate; this is UI only.
 */
export default function EarlyAccessCountdown({
  earlyAccessUntil,
  tier,
  className,
}: Props) {
  const until = useMemo(() => {
    if (!earlyAccessUntil) return null
    const d = new Date(earlyAccessUntil)
    return isNaN(d.getTime()) ? null : d
  }, [earlyAccessUntil])

  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    if (!until) return
    const interval = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [until])

  if (!until) return null
  if (canCustomerAccessProduct(tier, until, now)) return null

  const visibleFrom = tier ? computeTierVisibleFrom(until, tier) : until
  const remainingMs = visibleFrom.getTime() - now.getTime()
  const nextTier = nextTierForEarlierAccess(tier, until, now)

  return (
    <div className={className || "text-xs text-hg-text-secondary"}>
      Available to you in <span className="font-semibold">{formatCountdown(remainingMs)}</span>
      {nextTier && (
        <>
          {" — "}
          <span className="text-hg-gold">{nextTier.toUpperCase()}</span> members
          have access now.
        </>
      )}
    </div>
  )
}
