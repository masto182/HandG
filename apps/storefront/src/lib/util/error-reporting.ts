/**
 * Error reporting facade — re-exports @sentry/nextjs when a DSN is configured,
 * otherwise falls back to console for dev/CI parity.
 *
 * Sentry SDK init lives in sentry.{client,server,edge}.config.ts at the
 * storefront root. Those files are no-ops when NEXT_PUBLIC_SENTRY_DSN is empty,
 * so importing this module is always safe.
 */
import * as Sentry from "@sentry/nextjs"

const enabled = !!process.env.NEXT_PUBLIC_SENTRY_DSN

export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  if (enabled) {
    Sentry.captureException(error, context ? { extra: context } : undefined)
    return
  }
  // eslint-disable-next-line no-console
  console.error("[Error]", error, context)
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info"
): void {
  if (enabled) {
    Sentry.captureMessage(message, level)
    return
  }
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log(`[${level}]`, message)
  }
}
