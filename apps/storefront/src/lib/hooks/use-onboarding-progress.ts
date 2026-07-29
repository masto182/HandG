"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { sdk } from "@lib/config"
import { toast } from "sonner"

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

const STEP_ICONS: Record<string, string> = {
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

export async function markOnboardingStepComplete(
  stepId: string,
): Promise<
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
  const prevCompletedRef = useRef<string[]>([])
  const prevTierRef = useRef<string>("")

  const query = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: fetchOnboardingProgress,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })

  // Fire toasts when steps complete, detect tier upgrades
  useEffect(() => {
    if (!query.data) return

    const prev = prevCompletedRef.current
    const current = query.data.steps_completed

    if (prev.length > 0) {
      const newSteps = current.filter((s) => !prev.includes(s))
      for (const stepId of newSteps) {
        const step = query.data.steps[stepId]
        if (step) {
          const icon = STEP_ICONS[stepId] ?? "✓"
          toast.success(`${icon} ${step.label}`, {
            description: `+${step.points} pts earned`,
            duration: 4000,
          })
        }
      }

      // Tier upgrade
      if (
        prevTierRef.current &&
        query.data.current_tier !== prevTierRef.current &&
        query.data.current_tier !== "approved"
      ) {
        window.dispatchEvent(
          new CustomEvent("hg:tier-upgrade", {
            detail: { new_tier: query.data.current_tier },
          }),
        )
      }
    }

    prevCompletedRef.current = current
    prevTierRef.current = query.data.current_tier
  }, [query.data])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["onboarding-progress"] })

  return {
    progress: query.data ?? null,
    isLoading: query.isLoading,
    invalidate,
  }
}
