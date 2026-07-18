import { getLocaleHeader } from "@lib/util/get-locale-header"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

// Server-side: use the explicit backend URL so RSC data fetching hits the real
// Medusa backend directly.
// Client-side: use window.location.origin (same-origin) — in production Caddy
// routes /auth/* /store/* /admin/* to the backend; in CI, next.config.js
// rewrites via NEXT_REWRITES_BACKEND achieve the same. Same-origin ensures
// session cookies are set and readable by both browser and SSR.
const MEDUSA_BACKEND_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

// Server-side: prefer MEDUSA_PUBLISHABLE_KEY (no NEXT_PUBLIC_ prefix — read at
// runtime, never baked into the bundle) so each environment uses its own key
// independently without rebuilding the image.
// Client-side: NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY (baked at build time).
const PUBLISHABLE_KEY =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    : process.env.MEDUSA_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: PUBLISHABLE_KEY,
  auth: {
    type: "session",
  },
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs,
): Promise<T> => {
  const headers = init?.headers ?? {}
  let localeHeader: Record<string, string | null> | undefined
  try {
    localeHeader = await getLocaleHeader()
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
  } catch {}

  // Always inject the publishable key explicitly. The SDK's initClient() captures
  // it once at module-load time; if the module was first evaluated before env vars
  // were fully available (e.g. during Next.js prerender), the baked default-headers
  // may not have it. Server-side reads MEDUSA_PUBLISHABLE_KEY (runtime, not baked)
  // so each environment uses the correct key without rebuilding the image.
  const publishableKey =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
      : process.env.MEDUSA_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  const newHeaders: Record<string, string | null> = {
    ...localeHeader,
    ...headers,
    ...(publishableKey ? { "x-publishable-api-key": publishableKey } : {}),
  }
  init = {
    ...init,
    headers: newHeaders,
  }
  return originalFetch(input, init)
}
