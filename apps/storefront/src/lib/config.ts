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

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
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
  // may not have it. Reading from process.env here is always up-to-date.
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
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
