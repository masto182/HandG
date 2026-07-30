"use client"

import { useEffect } from "react"
import { completeOnboardingStep } from "@lib/data/onboarding"

type Props = {
  stepId: string
}

export default function PageVisitTracker({ stepId }: Props) {
  useEffect(() => {
    completeOnboardingStep(stepId).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
