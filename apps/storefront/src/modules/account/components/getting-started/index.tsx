"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  useOnboardingProgress,
  markOnboardingStepComplete,
  ONBOARDING_STEP_ICONS,
} from "@lib/hooks/use-onboarding-progress"
import type { OnboardingProgress } from "@lib/hooks/use-onboarding-progress"

const STEP_ICONS: Record<string, string> = {
  browse_hops: "🌿",
  browse_breweries: "🍺",
  hop_alert: "🔔",
  brewery_follow: "⭐",
  wishlist_add: "❤️",
  price_alert: "💰",
  stock_alert: "⚠️",
  address_added: "📍",
  vip_view: "🏆",
  referral_view: "🤝",
  email_prefs: "✉️",
}

const STEP_CTA: Record<string, { label: string; href: string }> = {
  browse_hops: { label: "Explore Hops", href: "/hops" },
  browse_breweries: { label: "Browse Breweries", href: "/breweries" },
  hop_alert: { label: "Find a Hop", href: "/hops" },
  brewery_follow: { label: "Browse Breweries", href: "/breweries" },
  wishlist_add: { label: "Go to Wishlist", href: "/account/wishlist" },
  price_alert: { label: "Set Alert", href: "/account/wishlist" },
  stock_alert: { label: "Set Alert", href: "/account/wishlist" },
  address_added: { label: "Add Address", href: "/account/profile" },
  vip_view: { label: "View My Tier", href: "/account/vip" },
  referral_view: { label: "Get My Code", href: "/account/referrals" },
  email_prefs: { label: "Email Settings", href: "/account/email-settings" },
}

const SECTIONS = [
  {
    key: "discover",
    title: "Discover",
    steps: ["browse_hops", "browse_breweries"],
  },
  {
    key: "notifications",
    title: "Get Notified",
    steps: ["hop_alert", "brewery_follow"],
  },
  {
    key: "wishlist",
    title: "Wishlist & Alerts",
    steps: ["wishlist_add", "price_alert", "stock_alert"],
  },
  {
    key: "account",
    title: "Your Account",
    steps: ["address_added", "email_prefs"],
  },
  { key: "loyalty", title: "Loyalty", steps: ["vip_view", "referral_view"] },
]

type StepRowProps = {
  stepId: string
  icon: string
  title: string
  description: string
  pointValue: number
  ctaLabel: string
  ctaHref: string
  completed: boolean
  onComplete: (stepId: string) => Promise<void>
}

function StepRow({
  stepId,
  icon,
  title,
  description,
  pointValue,
  ctaLabel,
  ctaHref,
  completed,
  onComplete,
}: StepRowProps) {
  const router = useRouter()

  const handleCta = async () => {
    if (!completed) {
      // Fire toast immediately before navigating so the user sees it
      const icon = ONBOARDING_STEP_ICONS[stepId] ?? "✓"
      toast.success(`${icon} ${title}`, {
        description: `+${pointValue} pts earned`,
        duration: 4000,
      })
      onComplete(stepId).catch(() => {})
    }
    router.push(ctaHref)
  }

  return (
    <div
      className={`flex items-center gap-3 py-3 border-b border-outline-variant/20 last:border-0 transition-opacity ${completed ? "opacity-60" : ""}`}
    >
      {/* Tick or empty circle */}
      <div
        className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-bold transition-all ${
          completed
            ? "bg-green-500/20 border-green-500/50 text-green-400"
            : "border-outline-variant/60 text-transparent"
        }`}
      >
        {completed ? "✓" : "○"}
      </div>

      {/* Icon + text */}
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium leading-none ${completed ? "line-through text-on-surface-variant" : "text-on-surface"}`}
        >
          {title}
        </span>
        <p className="text-xs text-on-surface-variant mt-0.5 truncate">
          {description}
        </p>
      </div>

      {/* Points + CTA */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {completed ? (
          <span className="text-xs text-green-400">+{pointValue} pts</span>
        ) : (
          <span className="text-xs text-primary font-medium">
            +{pointValue}
          </span>
        )}
        <button
          onClick={handleCta}
          className="text-xs text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap"
        >
          {ctaLabel} →
        </button>
      </div>
    </div>
  )
}

type Props = {
  initialProgress: OnboardingProgress
  customerName: string
}

export default function GettingStartedClient({
  initialProgress,
  customerName,
}: Props) {
  const { progress, invalidate } = useOnboardingProgress()
  const data = progress ?? initialProgress

  const stepsCompleted = new Set(data.steps_completed)
  const totalSteps = Object.keys(data.steps).length

  const handleComplete = async (stepId: string): Promise<void> => {
    await markOnboardingStepComplete(stepId)
    invalidate()
  }

  return (
    <div className="w-full space-y-8" data-testid="getting-started-page">
      <header>
        <h1 className="text-h1 text-on-surface mb-1">
          Welcome{customerName ? `, ${customerName}` : ""}
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Complete your setup and earn up to {data.max_points} VIP points.
        </p>
      </header>

      {/* Progress bar */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-2xl font-bold text-on-surface">
              {data.points_earned}
            </span>
            <span className="text-on-surface-variant text-sm">
              {" "}
              / {data.max_points} pts
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs text-on-surface-variant">
              Lifetime bonus pts
            </div>
            <div className="text-sm font-semibold text-primary">
              {data.lifetime_points}
            </div>
          </div>
        </div>
        <div className="w-full bg-outline-variant/20 rounded-full h-2 mb-3">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${data.pct_complete}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-on-surface-variant">
          <span>
            {stepsCompleted.size} of {totalSteps} steps complete
          </span>
          {data.current_tier === "approved" && data.vip_score < 100 && (
            <span className="text-primary">
              VIP1 in {100 - data.vip_score} pts
            </span>
          )}
          {data.current_tier !== "approved" && (
            <span className="text-green-400 font-medium">
              ✓ {data.current_tier.toUpperCase()} achieved
            </span>
          )}
        </div>
      </div>

      {/* Checklist sections */}
      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const sectionPts = section.steps.reduce(
            (sum, id) => sum + (data.steps[id]?.points ?? 0),
            0,
          )
          const sectionDone = section.steps.filter((id) =>
            stepsCompleted.has(id),
          ).length

          return (
            <div key={section.key}>
              <div className="flex items-center justify-between mb-1 px-1">
                <h3 className="text-label-caps text-on-surface-variant uppercase tracking-wider text-xs">
                  {section.title}
                </h3>
                <span className="text-xs text-on-surface-variant">
                  {sectionDone}/{section.steps.length} · {sectionPts} pts
                </span>
              </div>
              <div className="bg-surface-container border border-outline-variant/30 rounded-xl px-4">
                {section.steps.map((stepId) => {
                  const step = data.steps[stepId]
                  if (!step) return null
                  const cta = STEP_CTA[stepId] ?? { label: "Go", href: "/" }
                  return (
                    <StepRow
                      key={stepId}
                      stepId={stepId}
                      icon={STEP_ICONS[stepId] ?? "✓"}
                      title={step.label}
                      description={step.description}
                      pointValue={step.points}
                      ctaLabel={cta.label}
                      ctaHref={cta.href}
                      completed={stepsCompleted.has(stepId)}
                      onComplete={handleComplete}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
