"use client"

import { useEffect } from "react"
import { toast } from "sonner"

const TIER_LABELS: Record<string, string> = {
  vip1: "VIP1",
  vip2: "VIP2",
  vip3: "VIP3",
  vip4: "VIP4",
  vip5: "VIP5",
}

const TIER_PERKS: Record<string, string> = {
  vip1: "Early access: 0 hours offset — you're now in the club.",
  vip2: "Early access: 6 hours before general members.",
  vip3: "Early access: 12 hours before general members.",
  vip4: "Early access: 24 hours before general members.",
  vip5: "Early access: 48 hours — first to every drop.",
}

function TierUpgradeToastContent({
  tier,
  onDismiss,
}: {
  tier: string
  onDismiss: () => void
}) {
  const label = TIER_LABELS[tier] ?? tier.toUpperCase()
  const perk = TIER_PERKS[tier] ?? "New perks unlocked."

  return (
    <div className="flex flex-col gap-1 min-w-[260px]">
      <div className="flex items-center gap-2">
        <span className="text-lg">🏆</span>
        <span className="font-semibold text-sm">You've reached {label}</span>
      </div>
      <p className="text-xs text-gray-400">{perk}</p>
      <a
        href="/account/vip"
        className="text-xs text-amber-400 hover:underline mt-1"
        onClick={onDismiss}
      >
        See your perks →
      </a>
    </div>
  )
}

export default function TierUpgradeListener() {
  useEffect(() => {
    const handler = (e: Event) => {
      const { new_tier } = (e as CustomEvent).detail as { new_tier: string }
      const toastId = `tier-upgrade-${new_tier}`
      toast.custom(
        (t) => (
          <TierUpgradeToastContent
            tier={new_tier}
            onDismiss={() => toast.dismiss(t)}
          />
        ),
        {
          id: toastId,
          duration: 8000,
          style: {
            background: "#1a1a1a",
            border: "1px solid #d97706",
            borderRadius: "8px",
            padding: "12px 16px",
          },
        },
      )
    }

    window.addEventListener("hg:tier-upgrade", handler)
    return () => window.removeEventListener("hg:tier-upgrade", handler)
  }, [])

  return null
}
