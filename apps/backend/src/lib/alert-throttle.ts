export type QuietHoursConfig = {
  enabled: boolean
  fromHour: number
  toHour: number
  tz: string
}

export function getHourInTz(date: Date, tz: string): number {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    })
    const parts = fmt.formatToParts(date)
    const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0"
    const hour = parseInt(hourPart, 10)
    return hour === 24 ? 0 : hour
  } catch {
    return date.getUTCHours()
  }
}

export function isQuietHours(date: Date, config: QuietHoursConfig): boolean {
  if (!config.enabled) return false
  const from = config.fromHour
  const to = config.toHour
  if (from === to) return false
  const hour = getHourInTz(date, config.tz)
  if (from < to) {
    return hour >= from && hour < to
  }
  return hour >= from || hour < to
}

export function exceedsThrottle(sentInWindow: number, maxPerWindow: number): boolean {
  if (maxPerWindow <= 0) return false
  return sentInWindow >= maxPerWindow
}
