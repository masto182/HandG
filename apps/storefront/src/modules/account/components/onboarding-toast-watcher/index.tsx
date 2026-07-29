"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import {
  useOnboardingProgress,
  ONBOARDING_STEP_ICONS,
} from "@lib/hooks/use-onboarding-progress"

/**
 * Mounts once in the account layout. Fires sonner toasts when steps complete
 * on ANY page (cross-page completion via refetchOnWindowFocus), and dispatches
 * the tier-upgrade event for TierUpgradeListener to catch.
 */
export default function OnboardingToastWatcher() {
  const { progress } = useOnboardingProgress()
  const prevCompletedRef = useRef<string[]>([])
  const prevTierRef = useRef<string>("")
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!progress) return

    if (!initializedRef.current) {
      // Seed refs on first load so we only toast for changes after mount
      prevCompletedRef.current = progress.steps_completed
      prevTierRef.current = progress.current_tier
      initializedRef.current = true
      return
    }

    // New steps since last render
    const newSteps = progress.steps_completed.filter(
      (s) => !prevCompletedRef.current.includes(s),
    )
    for (const stepId of newSteps) {
      const step = progress.steps[stepId]
      if (step) {
        const icon = ONBOARDING_STEP_ICONS[stepId] ?? "✓"
        toast.success(`${icon} ${step.label}`, {
          description: `+${step.points} pts earned`,
          duration: 4000,
        })
      }
    }

    // Tier upgrade
    if (
      prevTierRef.current &&
      progress.current_tier !== prevTierRef.current &&
      progress.current_tier !== "approved"
    ) {
      window.dispatchEvent(
        new CustomEvent("hg:tier-upgrade", {
          detail: { new_tier: progress.current_tier },
        }),
      )
    }

    prevCompletedRef.current = progress.steps_completed
    prevTierRef.current = progress.current_tier
  }, [progress])

  return null
}
