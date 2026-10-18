"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  currentLowestTierWithAccess,
  productAccessForTier,
  readProductRelease,
  HOURS_BEFORE_PUBLIC_BY_TIER,
  type Tier,
} from "@lib/access/early-access"

type Props = {
  /** ISO string or Date when the product first becomes purchasable (VIP4/VIP5 unlock). */
  releaseAt?: string | Date | null
  /** Legacy public-release field; used only when releaseAt is absent. */
  earlyAccessUntil?: string | Date | null
  /** Retained for callers; the ladder is fixed in shared-types. */
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

function toRaw(v: string | Date | null | undefined): string | undefined {
  if (!v) return undefined
  if (v instanceof Date) return isNaN(v.getTime()) ? "invalid" : v.toISOString()
  return v
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "now"
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

/**
 * Live "available to you in X" countdown, shown in place of the buy button
 * while the viewer's tier is still locked. Refreshes the page at unlock so the
 * buy button appears without a manual reload. The backend gate is
 * authoritative.
 */
export default function EarlyAccessCountdown({
  releaseAt,
  earlyAccessUntil,
  viewerTier,
  className,
}: Props) {
  const router = useRouter()
  const metadata = useMemo(
    () => ({
      release_at: toRaw(releaseAt),
      early_access_until: toRaw(earlyAccessUntil),
    }),
    [releaseAt, earlyAccessUntil],
  )
  const release = useMemo(() => readProductRelease(metadata), [metadata])

  const [now, setNow] = useState<Date>(() => new Date())
  const access = productAccessForTier(metadata, viewerTier, now)

  useEffect(() => {
    if (release.status !== "scheduled") return
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [release.status])

  const unlockMs = access.unlockAt?.getTime() ?? null
  useEffect(() => {
    if (unlockMs === null) return
    const wait = unlockMs - Date.now()
    if (wait <= 0) return
    const t = setTimeout(() => router.refresh(), wait + 500)
    return () => clearTimeout(t)
  }, [unlockMs, router])

  if (release.status === "none" || !access.locked) return null

  if (release.status === "invalid" || !access.unlockAt) {
    return (
      <div
        className={
          className || "text-xs text-hg-text-secondary leading-relaxed"
        }
      >
        This release isn't available yet.
      </div>
    )
  }

  const remainingMs = access.unlockAt.getTime() - now.getTime()
  const lowest = currentLowestTierWithAccess(release.releaseAt, undefined, now)

  return (
    <div
      className={className || "text-xs text-hg-text-secondary leading-relaxed"}
    >
      {lowest && (
        <div>
          Currently available to{" "}
          <span className="font-semibold text-hg-gold">
            {TIER_LABEL[lowest]}
          </span>{" "}
          and above.
        </div>
      )}
      <div>
        Available to you in{" "}
        <span className="font-semibold font-mono">
          {formatCountdown(remainingMs)}
        </span>{" "}
        <span className="text-hg-text-secondary">
          (
          {access.unlockAt.toLocaleString("en-AU", {
            timeZone: "Australia/Sydney",
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
          )
        </span>
        .
      </div>
    </div>
  )
}
