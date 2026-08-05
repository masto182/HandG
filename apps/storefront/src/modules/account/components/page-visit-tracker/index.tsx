"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { completeOnboardingStep } from "@lib/data/onboarding"

type Props = {
  stepId: string
}

export default function PageVisitTracker({ stepId }: Props) {
  const router = useRouter()

  useEffect(() => {
    completeOnboardingStep(stepId)
      .then((completed) => {
        if (completed) router.refresh()
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
