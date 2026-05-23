/**
 * Plausible event helper.
 *
 * The Plausible script tag in app/layout.tsx attaches `window.plausible` only
 * when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set. This helper is therefore a no-op
 * during dev / CI / SSR — safe to call from any client component.
 *
 * Goals (configure these in the Plausible dashboard):
 *   - application_submitted  - registration form submit success
 *   - order_placed           - order confirmation page render
 *   - referral_sent          - referral code copied / shared
 *   - search                 - settled search query (q.length >= 2)
 */

export type GoalName =
  | "application_submitted"
  | "order_placed"
  | "referral_sent"
  | "search"

export type GoalProps = Record<string, string | number | boolean>

type PlausibleFn = (
  name: string,
  options?: { props?: GoalProps; callback?: () => void }
) => void

export function trackGoal(name: GoalName, props?: GoalProps): void {
  if (typeof window === "undefined") return
  const w = window as unknown as { plausible?: PlausibleFn }
  if (typeof w.plausible !== "function") return
  w.plausible(name, props ? { props } : undefined)
}
