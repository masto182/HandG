"use client"

import { useRouter } from "next/navigation"
import {
  useOnboardingProgress,
  markOnboardingStepComplete,
} from "@lib/hooks/use-onboarding-progress"
import type { OnboardingProgress } from "@lib/hooks/use-onboarding-progress"

type FeatureCardProps = {
  stepId: string
  icon: string
  title: string
  description: string
  pointValue: number
  ctaLabel: string
  ctaHref: string
  completed: boolean
  onComplete: (stepId: string) => void
}

function FeatureCard({
  stepId,
  icon,
  title,
  description,
  pointValue,
  ctaLabel,
  ctaHref,
  completed,
  onComplete,
}: FeatureCardProps) {
  const router = useRouter()

  const handleCta = () => {
    if (!completed) {
      onComplete(stepId)
    }
    router.push(ctaHref)
  }

  return (
    <div
      className={`relative border rounded-xl p-4 flex flex-col gap-3 transition-all ${
        completed
          ? "bg-surface-container/50 border-outline-variant/20 opacity-80"
          : "bg-surface-container border-outline-variant/40 hover:border-outline-variant/60"
      }`}
    >
      {completed && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-2 py-0.5">
          ✓ Done
        </span>
      )}
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-on-surface leading-snug">
              {title}
            </h4>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-auto pt-1">
        {completed ? (
          <span className="text-xs text-green-400">
            +{pointValue} pts awarded
          </span>
        ) : (
          <span className="text-xs text-primary font-medium bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
            +{pointValue} pts
          </span>
        )}
        <button
          onClick={handleCta}
          className="text-xs text-on-surface-variant hover:text-on-surface underline-offset-2 hover:underline transition-colors"
        >
          {ctaLabel} →
        </button>
      </div>
    </div>
  )
}

type SectionProps = {
  title: string
  totalPoints: number
  children: React.ReactNode
}

function Section({ title, totalPoints, children }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-label-caps text-on-surface-variant uppercase tracking-wider text-xs">
          {title}
        </h3>
        <span className="text-xs text-on-surface-variant">
          {totalPoints} pts
        </span>
      </div>
      <div className="grid grid-cols-1 small:grid-cols-2 gap-3">{children}</div>
    </div>
  )
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

const STEP_CTA: Record<string, { label: string; href: string }> = {
  browse_hops: { label: "Explore Hops", href: "/hops" },
  browse_breweries: { label: "Browse Breweries", href: "/breweries" },
  hop_alert: { label: "Find a Hop", href: "/hops" },
  brewery_follow: { label: "Browse Breweries", href: "/breweries" },
  restock_alert: { label: "Browse Store", href: "/store" },
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
    steps: ["hop_alert", "brewery_follow", "restock_alert"],
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
  {
    key: "loyalty",
    title: "Loyalty",
    steps: ["vip_view", "referral_view"],
  },
]

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

  const handleComplete = async (stepId: string) => {
    await markOnboardingStepComplete(stepId)
    invalidate()
  }

  const progressPct = data.pct_complete

  return (
    <div className="w-full space-y-8" data-testid="getting-started-page">
      <header>
        <h1 className="text-h1 text-on-surface mb-1">
          Welcome{customerName ? `, ${customerName}` : ""}
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Here's how to get the most out of Hops & Glory.
        </p>
      </header>

      {/* Progress header */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-2xl font-bold text-on-surface">
              {data.points_earned}
            </span>
            <span className="text-on-surface-variant text-sm">
              {" "}
              / {data.max_points} pts earned
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
            style={{ width: `${progressPct}%` }}
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

      {/* Feature sections */}
      <div className="space-y-8">
        {SECTIONS.map((section) => {
          const sectionPts = section.steps.reduce(
            (sum, id) => sum + (data.steps[id]?.points ?? 0),
            0,
          )
          return (
            <Section
              key={section.key}
              title={section.title}
              totalPoints={sectionPts}
            >
              {section.steps.map((stepId) => {
                const step = data.steps[stepId]
                if (!step) return null
                const cta = STEP_CTA[stepId] ?? { label: "Go", href: "/" }
                return (
                  <FeatureCard
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
            </Section>
          )
        })}
      </div>
    </div>
  )
}
