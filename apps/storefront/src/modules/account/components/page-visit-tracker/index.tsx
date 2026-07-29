"use client"

import { useEffect } from "react"
import { markOnboardingStepComplete } from "@lib/hooks/use-onboarding-progress"

type Props = {
  stepId: string
}

export default function PageVisitTracker({ stepId }: Props) {
  useEffect(() => {
    markOnboardingStepComplete(stepId).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
