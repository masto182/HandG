import { sdk } from "@lib/config"
import { getPublicConfig } from "@lib/data/site-config"
import { getAuthHeaders } from "@lib/data/cookies"

type VipData = {
  tier: string
  score: {
    personal_spend: number
    direct_referral_spend: number
    indirect_referral_spend: number
    total: number
  }
  orders_window: number
  next_tier: {
    tier: string
    requirements: { score: number }
    progress: { score_needed: number }
    perk_offset_hours: number
  } | null
  demotion_grace_days: number
  referral_code: string | null
  network_stats: { members_referred: number; network_contribution: number }
  pending_demotion: boolean
  tier_achieved_at: string | null
  demotion_warning_at: string | null
}

const TIER_KEYS = ["approved", "vip1", "vip2", "vip3", "vip4", "vip5"] as const
type TierKey = (typeof TIER_KEYS)[number]

type TierMeta = { key: TierKey; label: string; points: string; perk: string }

function formatPerk(hours: number): string {
  if (hours <= 0) return "Member-Only Store"
  if (hours < 24) return `${hours}h Early Access`
  const days = hours / 24
  return Number.isInteger(days) ? `${days}d Priority Access` : `${hours}h Priority Access`
}

function buildTiers(offsets: Record<string, number>, thresholds: Record<string, number>): TierMeta[] {
  return [
    { key: "approved", label: "Approved", points: "Entry", perk: "Standard Archives" },
    { key: "vip1", label: "VIP1", points: `${thresholds.vip1 ?? 100} pts`, perk: formatPerk(offsets.vip1 ?? 0) },
    { key: "vip2", label: "VIP2", points: `${thresholds.vip2 ?? 250} pts`, perk: formatPerk(offsets.vip2 ?? 6) },
    { key: "vip3", label: "VIP3", points: `${thresholds.vip3 ?? 450} pts`, perk: formatPerk(offsets.vip3 ?? 12) },
    { key: "vip4", label: "VIP4", points: `${thresholds.vip4 ?? 700} pts`, perk: formatPerk(offsets.vip4 ?? 24) },
    { key: "vip5", label: "VIP5", points: `${thresholds.vip5 ?? 1000} pts`, perk: formatPerk(offsets.vip5 ?? 48) },
  ]
}

async function fetchVipData(): Promise<VipData | null> {
  try {
    const headers = await getAuthHeaders()
    return await sdk.client.fetch<VipData>("/store/customers/me/vip", {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    })
  } catch {
    return null
  }
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n)

export default async function VipPage() {
  const [data, cfg] = await Promise.all([fetchVipData(), getPublicConfig()])

  const offsets = (cfg.vip_early_access_offsets_hours as Record<string, number>) || {
    vip1: 0, vip2: 6, vip3: 12, vip4: 24, vip5: 48,
  }
  // Thresholds aren't public; use the defaults we ship in shared-types.
  const thresholds = { vip1: 100, vip2: 250, vip3: 450, vip4: 700, vip5: 1000 }
  const TIERS = buildTiers(offsets, thresholds)

  const currentTier = data?.tier || "approved"
  const tierIdx = TIERS.findIndex((t) => t.key === currentTier)
  const currentTierInfo = TIERS[tierIdx >= 0 ? tierIdx : 0]
  const nextTierInfo = tierIdx < TIERS.length - 1 ? TIERS[tierIdx + 1] : null
  const score = data?.score?.total || 0
  const personal = data?.score?.personal_spend || 0
  const direct = data?.score?.direct_referral_spend || 0
  const indirect = data?.score?.indirect_referral_spend || 0
  const nextScore = data?.next_tier?.requirements?.score || (nextTierInfo ? thresholds[nextTierInfo.key as keyof typeof thresholds] : 0)
  const progressPercent = nextScore > 0 ? Math.min((score / nextScore) * 100, 100) : 100
  const pointsNeeded = data?.next_tier?.progress?.score_needed || Math.max(0, nextScore - score)
  const graceDays = data?.demotion_grace_days ?? 30

  return (
    <div className="w-full" data-testid="vip-page-wrapper">
      <header className="mb-8">
        <h1 className="text-h1 text-on-surface mb-1">VIP Status</h1>
        <p className="text-body-lg text-on-surface-variant">Where you sit on the ladder.</p>
      </header>

      {data?.pending_demotion && (
        <div className="flex items-center gap-3 p-4 bg-secondary/10 border border-secondary/30 rounded-xl mb-6" data-testid="vip-demotion-warning">
          <svg className="w-5 h-5 text-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-body-sm text-secondary font-medium">
            Heads up — your score dropped below {currentTierInfo.label}. You have {graceDays} days to restore it before you step down a tier.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-h3 font-bold text-on-surface mb-1">Current score: {Math.round(score)}</h3>
                  {nextTierInfo && (
                    <p className="text-body-sm text-primary">Next: {nextTierInfo.label} at {nextScore}</p>
                  )}
                </div>
                <span className="text-label-caps text-secondary bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20">
                  ACTIVE TIER: {currentTierInfo.label.toUpperCase()}
                </span>
              </div>
              <div className="h-3 w-full bg-surface-container-highest rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(142,213,177,0.5)] transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-body-sm text-on-surface-variant">
                You need <span className="text-on-surface font-bold">{pointsNeeded} more VIP points</span> to reach the next milestone.
              </p>
            </div>
          </div>

          {/* Score breakdown — Sprint 3 split */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6" data-testid="vip-score-breakdown">
            <h4 className="text-label-caps text-on-surface tracking-wider mb-4">SCORE BREAKDOWN (3-MONTH ROLLING)</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline border-b border-outline-variant/10 pb-2">
                <div>
                  <p className="text-body-md text-on-surface font-medium">Personal spend</p>
                  <p className="text-[11px] text-on-surface-variant">1 pt per $1 you spend</p>
                </div>
                <p className="text-body-md font-bold tabular-nums text-on-surface" data-testid="vip-personal">{fmtCurrency(personal)}</p>
              </div>
              <div className="flex justify-between items-baseline border-b border-outline-variant/10 pb-2">
                <div>
                  <p className="text-body-md text-on-surface font-medium">Direct referrals</p>
                  <p className="text-[11px] text-on-surface-variant">1 pt per $5 spent by people you referred</p>
                </div>
                <p className="text-body-md font-bold tabular-nums text-on-surface" data-testid="vip-direct">{fmtCurrency(direct)}</p>
              </div>
              <div className="flex justify-between items-baseline">
                <div>
                  <p className="text-body-md text-on-surface font-medium">Indirect referrals</p>
                  <p className="text-[11px] text-on-surface-variant">1 pt per $10 spent by their referrals</p>
                </div>
                <p className="text-body-md font-bold tabular-nums text-on-surface" data-testid="vip-indirect">{fmtCurrency(indirect)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="relative pl-8" data-testid="vip-tier-ladder">
            <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-outline-variant/30" />
            <div className="space-y-6">
              {[...TIERS].reverse().map((tier, i) => {
                const reversedIdx = TIERS.length - 1 - i
                const isCurrent = reversedIdx === tierIdx
                const isBelow = reversedIdx < tierIdx
                const isNext = reversedIdx === tierIdx + 1
                const isFuture = reversedIdx > tierIdx + 1

                return (
                  <div key={tier.key} className={`relative flex items-center gap-4 ${isFuture ? "opacity-40" : ""}`}>
                    {isCurrent ? (
                      <div className="absolute -left-[11px] w-[22px] h-[22px] rounded-full bg-primary border-2 border-primary ring-4 ring-primary/20 shadow-[0_0_14px_rgba(142,213,177,0.7)] z-20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-on-primary" />
                      </div>
                    ) : isNext ? (
                      <div className="absolute -left-[9px] w-[18px] h-[18px] rounded-full bg-surface-container border-2 border-primary/50 z-20 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                      </div>
                    ) : isBelow ? (
                      <div className="absolute -left-[7px] w-4 h-4 rounded-full bg-primary/30 border-2 border-primary/40 z-10 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="absolute -left-[7px] w-4 h-4 rounded-full bg-surface-container-highest border-2 border-outline-variant z-10" />
                    )}
                    <div className={`${
                      isCurrent
                        ? "bg-primary/10 border-primary/50 shadow-md"
                        : isNext
                        ? "bg-surface-container-low border-outline-variant/40"
                        : isBelow
                        ? "bg-surface-container-low border-outline-variant/20 opacity-60"
                        : "bg-surface-container-low border-outline-variant/20"
                    } border p-4 rounded-xl w-full`}>
                      <div className="flex justify-between items-center">
                        <span className={`font-bold ${
                          isCurrent ? "text-primary" : "text-on-surface"
                        }`}>
                          {tier.label}
                          {isCurrent && <span className="ml-2 text-[10px] font-normal text-primary/70 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full align-middle">YOU ARE HERE</span>}
                          {isNext && <span className="ml-2 text-[10px] font-normal text-secondary bg-secondary/10 border border-secondary/20 px-2 py-0.5 rounded-full align-middle">NEXT LEVEL</span>}
                        </span>
                        <span className={`text-label-caps ${isCurrent ? "text-primary" : "text-on-surface-variant"}`}>{tier.points}</span>
                      </div>
                      <p className="text-[12px] text-on-surface-variant mt-1">{tier.perk}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-10 pt-8 border-t border-outline-variant/20">
        <div className="flex items-start gap-3 text-on-surface-variant">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-body-sm italic max-w-2xl">
            Points accumulate on a 3-month rolling window. Tier perks reflect current early-access policy and are subject to brewery availability and regional shipping laws.
          </p>
        </div>
      </footer>
    </div>
  )
}
