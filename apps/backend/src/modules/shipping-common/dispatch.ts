import type { CarrierGroup } from "./normalise"

export type DispatchDaysConfig = Partial<Record<CarrierGroup, number[]>>

export const DEFAULT_ARAMEX_ALLOWED_STATES = ["NSW", "VIC", "SA"]

export const DEFAULT_DISPATCH_DAYS: DispatchDaysConfig = {
  aramex: [1, 2],
  couriers_please: [1, 2],
  australia_post: [1, 2, 3],
}

export const WEEKDAYS = [1, 2, 3, 4, 5]
export const DISPATCH_TZ = "Australia/Sydney"

const STATE_NAMES: Record<string, string> = {
  "NEW SOUTH WALES": "NSW",
  VICTORIA: "VIC",
  "SOUTH AUSTRALIA": "SA",
  QUEENSLAND: "QLD",
  "WESTERN AUSTRALIA": "WA",
  TASMANIA: "TAS",
  "NORTHERN TERRITORY": "NT",
  "AUSTRALIAN CAPITAL TERRITORY": "ACT",
}

export function normaliseAuState(province: string | null | undefined): string {
  const raw = (province ?? "")
    .trim()
    .toUpperCase()
    .replace(/^AU[-_ ]/, "")
  return STATE_NAMES[raw] ?? raw
}

export function isAramexAllowedForState(
  province: string | null | undefined,
  allowed: string[] | null | undefined
): boolean {
  const list = (allowed && allowed.length ? allowed : DEFAULT_ARAMEX_ALLOWED_STATES).map(
    normaliseAuState
  )
  const state = normaliseAuState(province)
  return state !== "" && list.includes(state)
}

export function resolveDispatchDays(
  group: CarrierGroup | string | undefined,
  config: DispatchDaysConfig | null | undefined
): number[] {
  const merged = { ...DEFAULT_DISPATCH_DAYS, ...(config ?? {}) } as Record<string, number[]>
  const days = group ? merged[group] : undefined
  return Array.isArray(days) && days.length ? days : WEEKDAYS
}

function sydneyDateParts(now: Date, tz: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { y: get("year"), m: get("month"), d: get("day") }
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

const DAY_MS = 86_400_000

/**
 * First dispatch day strictly after the order's local (Sydney) date.
 * Returns YYYY-MM-DD.
 */
export function nextDispatchDate(
  now: Date,
  dispatchWeekdays: number[],
  tz: string = DISPATCH_TZ
): string {
  const { y, m, d } = sydneyDateParts(now, tz)
  let ms = Date.UTC(y, m - 1, d)
  for (let i = 0; i < 8; i++) {
    ms += DAY_MS
    if (dispatchWeekdays.includes(new Date(ms).getUTCDay())) return toIso(ms)
  }
  return toIso(ms)
}

export function addBusinessDays(isoDate: string, days: number): string {
  let ms = Date.parse(`${isoDate}T00:00:00Z`)
  let left = Math.max(0, Math.round(days))
  while (left > 0) {
    ms += DAY_MS
    const wd = new Date(ms).getUTCDay()
    if (wd !== 0 && wd !== 6) left--
  }
  return toIso(ms)
}

/**
 * Earliest/latest delivery given a dispatch date and carrier transit days
 * (business days). Mirrors the previous storefront window of days-1 .. days+1.
 */
export function estimateDeliveryRange(
  dispatchIso: string,
  transitDays: number
): { earliest: string; latest: string } {
  return {
    earliest: addBusinessDays(dispatchIso, Math.max(1, transitDays - 1)),
    latest: addBusinessDays(dispatchIso, transitDays + 1),
  }
}

export const DEFAULT_ARAMEX_NOTICE =
  "This carrier is dispatched on Mondays and Tuesdays, and only to NSW, VIC and SA. We use these dispatch days to reduce the chance of beer sitting in sorting centres over the weekend. Need it sooner or somewhere else? Contact us and we'll work out an alternative option."
