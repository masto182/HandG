"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "@lib/config"

export type OnboardingStep = {
  label: string
  points: number
  section: string
  description: string
}

export type OnboardingProgress = {
  steps_completed: string[]
  points_earned: number
  max_points: number
  pct_complete: number
  steps: Record<string, OnboardingStep>
  vip_score: number
  lifetime_points: number
  current_tier: string
}

export const ONBOARDING_STEP_ICONS: Record<string, string> = {
  browse_hops: "🌿",
  browse_breweries: "🍺",
  hop_alert: "🔔",
  brewery_follow: "⭐",
  restock_alert: "📦",
  wishlist_add: "❤️",
  price_alert: "💰",
  stock_alert: "⚠️",
  address_added: "📍",
  vip_view: "🏆",
  referral_view: "🤝",
  email_prefs: "✉️",
}

async function fetchOnboardingProgress(): Promise<OnboardingProgress> {
  return sdk.client.fetch<OnboardingProgress>(
    "/store/customers/me/onboarding",
    { method: "GET" },
  )
}

export async function markOnboardingStepComplete(stepId: string): Promise<
  OnboardingProgress & {
    already_claimed?: boolean
    tier_promoted?: boolean
    new_tier?: string | null
  }
> {
  return sdk.client.fetch("/store/customers/me/onboarding/complete-step", {
    method: "POST",
    body: { step_id: stepId },
  })
}

export function useOnboardingProgress() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: fetchOnboardingProgress,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["onboarding-progress"] })

  return {
    progress: query.data ?? null,
    isLoading: query.isLoading,
    invalidate,
  }
}
