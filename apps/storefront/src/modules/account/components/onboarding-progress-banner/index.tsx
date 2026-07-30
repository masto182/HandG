"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

type OnboardingProgress = {
  steps_completed: string[]
  points_earned: number
  max_points: number
  pct_complete: number
  steps: Record<string, { label: string; points: number }>
}

const DISMISSED_KEY = "hg_onboarding_banner_dismissed"

function isDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "true"
  } catch {
    return false
  }
}

type Props = {
  initialProgress?: OnboardingProgress | null
}

export default function OnboardingProgressBanner({ initialProgress }: Props) {
  const [dismissed, setDismissed] = useState(() => isDismissed())
  const pathname = usePathname()

  if (!initialProgress || initialProgress.pct_complete >= 100 || dismissed)
    return null
  if (pathname?.includes("/getting-started")) return null

  const progress = initialProgress
  const totalSteps = Object.keys(progress.steps).length
  const ptsRemaining = progress.max_points - progress.points_earned

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "true")
    } catch {}
    setDismissed(true)
  }

  return (
    <div className="relative flex items-center justify-center gap-3 px-6 py-2 bg-hg-bg border-b border-hg-gold/20 text-sm overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 bg-hg-gold/5 transition-all duration-700 pointer-events-none"
        style={{ width: `${progress.pct_complete}%` }}
      />

      <div className="relative flex items-center gap-3 z-10">
        <span className="text-hg-gold font-bold text-xs uppercase tracking-widest">
          Getting Started
        </span>
        <div className="w-24 h-1 bg-hg-border/40 rounded-full overflow-hidden hidden small:block">
          <div
            className="bg-hg-gold h-1 rounded-full transition-all duration-500"
            style={{ width: `${progress.pct_complete}%` }}
          />
        </div>
        <span className="text-hg-text-muted text-xs">
          <span className="text-hg-gold font-semibold">
            {progress.pct_complete}%
          </span>{" "}
          done · {progress.steps_completed.length}/{totalSteps} steps
        </span>
        <Link
          href="/account/getting-started"
          className="text-xs font-semibold text-hg-gold hover:underline whitespace-nowrap"
        >
          Earn {ptsRemaining} more pts →
        </Link>
      </div>

      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 opacity-50 hover:opacity-100 transition-opacity z-10"
        aria-label="Dismiss getting started banner"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 1l12 12M13 1L1 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
