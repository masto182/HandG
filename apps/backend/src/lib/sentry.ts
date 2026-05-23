import * as Sentry from "@sentry/node"

let initialised = false

/**
 * Initialise Sentry for the backend (Medusa server + jobs + scripts).
 *
 * No-op when SENTRY_DSN is empty so dev/CI runs are unaffected. Should be
 * invoked exactly once per process — currently called from medusa-config.ts
 * top-level so every entry point (server, workers, `medusa exec`) shares the
 * same init.
 */
export function initSentry(): void {
  if (initialised) return
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    environment: process.env.NODE_ENV || "development",
    release: process.env.GIT_SHA || undefined,
  })
  initialised = true
}
