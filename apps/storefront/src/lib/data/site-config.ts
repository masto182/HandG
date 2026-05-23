import "server-only"
import { cache } from "react"
import { PUBLIC_SITE_CONFIG_DEFAULTS, type PublicSiteConfig } from "@retail-example/shared-types"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/**
 * Fetch the public site config from the backend, cached per request.
 * Falls back to shared-types defaults if the backend is unreachable.
 *
 * Server-only: use in server components or `"use server"` actions only.
 */
export const getPublicConfig = cache(async (): Promise<PublicSiteConfig> => {
  try {
    // sdk-exempt: SSR fetch with TTL caching; SDK client adds auth headers we don't need here
    const res = await fetch(`${BACKEND_URL}/store/site-config/public`, { // sdk-exempt
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      next: { revalidate: 60 },
    })
    if (!res.ok) return PUBLIC_SITE_CONFIG_DEFAULTS
    const data = (await res.json()) as { config: Partial<PublicSiteConfig> }
    return { ...PUBLIC_SITE_CONFIG_DEFAULTS, ...data.config }
  } catch {
    return PUBLIC_SITE_CONFIG_DEFAULTS
  }
})

export async function getPayidAlias(): Promise<string> {
  const cfg = await getPublicConfig()
  return cfg.payid_alias
}
