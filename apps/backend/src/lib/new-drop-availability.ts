import { HOURS_AFTER_RELEASE_BY_TIER, productAccessForTier, type Tier } from "./access/early-access"

const RELEASE_TIMEZONE = "Australia/Sydney"

export function toTier(value: unknown): Tier | null {
  return typeof value === "string" && value in HOURS_AFTER_RELEASE_BY_TIER ? (value as Tier) : null
}

/** True when some other tier unlocks earlier than this one. */
export function hasEarlierTier(tier: Tier | null): boolean {
  const earliest = Math.min(...Object.values(HOURS_AFTER_RELEASE_BY_TIER))
  const mine = tier ? HOURS_AFTER_RELEASE_BY_TIER[tier] : Infinity
  return mine > earliest
}

export function formatUnlockTime(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: RELEASE_TIMEZONE,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  )
  return `${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute}${String(
    parts.dayPeriod
  ).toLowerCase()}`
}

/** Recipient-specific access line for a digest product; null when no release gating applies. */
export function describeAvailability(
  metadata: Record<string, unknown> | null | undefined,
  tier: Tier | null,
  now: Date = new Date()
): string | null {
  const access = productAccessForTier(metadata, tier, now)
  if (!access.unlockAt) return null
  if (!access.locked) return "Available to you now"
  return `Available to you from ${formatUnlockTime(access.unlockAt)}`
}
