import React from "react"

export type TierLadderEntry = {
  key: "approved" | "vip1" | "vip2" | "vip3" | "vip4" | "vip5"
  label: string
  points: string
  perk: string
}

type Props = {
  tiers: TierLadderEntry[]
  currentTier: TierLadderEntry["key"]
}

/**
 * Pure presentational ladder component, extracted from the VIP page so unit
 * tests can verify state transitions without rendering the entire dashboard.
 */
export default function TierLadder({ tiers, currentTier }: Props) {
  const tierIdx = tiers.findIndex((t) => t.key === currentTier)

  return (
    <div data-testid="tier-ladder" className="space-y-6">
      {[...tiers].reverse().map((tier, i) => {
        const reversedIdx = tiers.length - 1 - i
        const isCurrent = reversedIdx === tierIdx
        const isBelow = reversedIdx < tierIdx
        const isNext = reversedIdx === tierIdx + 1

        return (
          <div key={tier.key} data-testid={`tier-row-${tier.key}`} data-state={
            isCurrent ? "current" : isNext ? "next" : isBelow ? "below" : "future"
          }>
            <span>{tier.label}</span>
            {isCurrent && <span data-testid={`tier-current-${tier.key}`}>YOU ARE HERE</span>}
            {isNext && <span data-testid={`tier-next-${tier.key}`}>NEXT LEVEL</span>}
            <span>{tier.points}</span>
            <p data-testid={`tier-perk-${tier.key}`}>{tier.perk}</p>
          </div>
        )
      })}
    </div>
  )
}
