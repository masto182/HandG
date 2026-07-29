"use client"

import { useEffect } from "react"
import { markOnboardingStepComplete } from "@lib/hooks/use-onboarding-progress"

const SESSION_KEY = "hg_visited_steps"

function getVisited(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]"))
  } catch {
    return new Set()
  }
}

function markVisited(stepId: string) {
  try {
    const visited = getVisited()
    visited.add(stepId)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...visited]))
  } catch {}
}

type Props = {
  stepId: string
}

export default function PageVisitTracker({ stepId }: Props) {
  useEffect(() => {
    if (getVisited().has(stepId)) return
    markVisited(stepId)
    markOnboardingStepComplete(stepId).catch(() => {})
  }, [stepId])

  return null
}
