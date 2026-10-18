"use client"

import { useEffect, useMemo, useState } from "react"
import {
  currentLowestTierWithAccess,
  productAccessForTier,
  readProductRelease,
  HOURS_BEFORE_PUBLIC_BY_TIER,
  type Tier,
} from "@lib/access/early-access"
import Icon from "@modules/common/components/icon"

type Props = {
  releaseAt?: string | null
  earlyAccessUntil?: string | null
  offsets?: typeof HOURS_BEFORE_PUBLIC_BY_TIER
  viewerTier: Tier | null
}

const TIER_LABEL: Record<Tier, string> = {
  vip5: "VIP5",
  vip4: "VIP4",
  vip3: "VIP3",
  vip2: "VIP2",
  vip1: "VIP1",
  approved: "Members",
}

function formatHHMMSS(ms: number): string {
  if (ms <= 0) return "00:00:00"
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function EarlyAccessOverlay({
  releaseAt,
  earlyAccessUntil,
  viewerTier,
}: Props) {
  const metadata = useMemo(
    () => ({
      release_at: releaseAt ?? undefined,
      early_access_until: earlyAccessUntil ?? undefined,
    }),
    [releaseAt, earlyAccessUntil],
  )
  const parsed = useMemo(() => readProductRelease(metadata), [metadata])
  const release = parsed.status === "scheduled" ? parsed.releaseAt : null

  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    if (!release) return
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [release])

  if (!release || !viewerTier) return null
  const access = productAccessForTier(metadata, viewerTier, now)
  if (!access.locked || !access.unlockAt) return null

  const remainingMs = access.unlockAt.getTime() - now.getTime()
  if (remainingMs <= 0) return null

  const lowest = currentLowestTierWithAccess(release, undefined, now)
  const lowestLabel = lowest ? TIER_LABEL[lowest] : TIER_LABEL.vip5

  return (
    <div className="absolute inset-0 bg-hg-overlay-bg backdrop-blur-[8px] z-10 flex flex-col items-center justify-center gap-3">
      <Icon name="lock" size={30} className="text-hg-overlay-text" />
      <span className="text-[12px] font-bold text-hg-overlay-text uppercase tracking-widest text-center px-4">
        Available to {lowestLabel} and above
      </span>
      <span className="text-sm font-mono font-bold text-hg-gold tracking-wider">
        {formatHHMMSS(remainingMs)}
      </span>
    </div>
  )
}
