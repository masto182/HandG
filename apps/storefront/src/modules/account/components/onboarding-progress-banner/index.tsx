"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useOnboardingProgress } from "@lib/hooks/use-onboarding-progress"

export default function OnboardingProgressBanner() {
  const { progress } = useOnboardingProgress()
  const pathname = usePathname()

  // Hidden when: no data yet, all complete, or already on the getting-started page
  if (!progress || progress.pct_complete >= 100) return null
  if (pathname?.includes("/getting-started")) return null

  const totalSteps = Object.keys(progress.steps).length

  return (
    <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-hg-gold/5 border border-hg-gold/20 rounded-xl">
      {/* Progress bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-hg-gold uppercase tracking-widest">
            Getting Started
          </span>
          <span className="text-xs text-hg-text-muted">
            {progress.steps_completed.length}/{totalSteps} steps
          </span>
        </div>
        <div className="w-full bg-hg-border/40 rounded-full h-1">
          <div
            className="bg-hg-gold h-1 rounded-full transition-all duration-500"
            style={{ width: `${progress.pct_complete}%` }}
          />
        </div>
      </div>

      {/* % + CTA */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-lg font-bold text-hg-gold">
          {progress.pct_complete}%
        </span>
        <Link
          href="/account/getting-started"
          className="text-xs text-hg-gold border border-hg-gold/30 rounded-lg px-3 py-1.5 hover:bg-hg-gold/10 transition-colors whitespace-nowrap"
        >
          Continue →
        </Link>
      </div>
    </div>
  )
}
