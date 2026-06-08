"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"
import {
  HOURS_BEFORE_PUBLIC_BY_TIER,
  type Tier,
} from "@retail-example/shared-types"

export type EarlyAccessOffsets = typeof HOURS_BEFORE_PUBLIC_BY_TIER

const FALLBACK: EarlyAccessOffsets = HOURS_BEFORE_PUBLIC_BY_TIER

type VipResponse = {
  tier?: string
  early_access_offsets?: EarlyAccessOffsets
}

/**
 * Resolve the per-tier early-access offsets and the viewer's current tier.
 *
 * Source of truth is the backend /store/customers/me/vip response, which the
 * storefront would otherwise fetch separately for membership / VIP-score
 * surfaces. The endpoint resolves offsets from site-config server-side, so
 * site config changes propagate without redeploying.
 *
 * Anonymous viewers (no auth header) skip the fetch entirely and receive
 * the static fallback. They never see the countdown overlay anyway, so the
 * offsets are unused on their path.
 */
export async function getEarlyAccessConfig(): Promise<{
  offsets: EarlyAccessOffsets
  viewerTier: Tier | null
}> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) {
    return { offsets: FALLBACK, viewerTier: null }
  }
  try {
    const res = await sdk.client.fetch<VipResponse>("/store/customers/me/vip", {
      method: "GET",
      headers,
      next: { tags: ["vip-config"], revalidate: 300 },
    })
    return {
      offsets: res?.early_access_offsets ?? FALLBACK,
      viewerTier: (res?.tier as Tier | undefined) ?? null,
    }
  } catch {
    return { offsets: FALLBACK, viewerTier: null }
  }
}
