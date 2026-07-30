"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useOnboardingProgress } from "@lib/hooks/use-onboarding-progress"

const DISMISSED_KEY = "hg_onboarding_banner_dismissed"

function getBannerDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "true"
  } catch {
    return false
  }
}

export default function OnboardingProgressBanner() {
  const { progress } = useOnboardingProgress()
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(getBannerDismissed())
  }, [])

  if (!progress || progress.pct_complete >= 100 || dismissed) return null
  if (pathname?.includes("/getting-started")) return null

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "true")
    } catch {}
    setDismissed(true)
  }

  const totalSteps = Object.keys(progress.steps).length

  return (
    <div className="relative flex items-center justify-center gap-3 px-6 py-2 bg-hg-bg border-b border-hg-gold/20 text-sm">
      {/* Progress fill behind text */}
      <div
        className="absolute inset-0 bg-hg-gold/5 transition-all duration-700"
        style={{ width: `${progress.pct_complete}%` }}
      />

      {/* Content */}
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
          Earn {progress.max_points - progress.points_earned} more pts →
        </Link>
      </div>

      {/* Dismiss */}
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
