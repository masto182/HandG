import { MembershipStatus } from "@lib/data/membership"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const BADGE_CONFIG: Record<string, { image: string; label: string }> = {
  approved: { image: "/badges/Member.png", label: "Member" },
  vip1: { image: "/badges/VIP1.png", label: "VIP 1" },
  vip2: { image: "/badges/VIP2.png", label: "VIP 2" },
  vip3: { image: "/badges/VIP3.png", label: "VIP 3" },
  vip4: { image: "/badges/VIP4.png", label: "VIP 4" },
  vip5: { image: "/badges/VIP5.png", label: "VIP 5" },
}

export default function VipBadge({ tier }: { tier: MembershipStatus }) {
  const config = BADGE_CONFIG[tier]
  if (!config) return null

  return (
    <LocalizedClientLink href="/account/vip" data-testid="vip-badge" className="relative flex h-[60px] w-[60px] items-center justify-center hover:scale-110 transition-transform">
      <img
        src={config.image}
        alt={`${config.label} Badge`}
        className="h-[60px] w-[60px] object-contain drop-shadow-lg"
      />
    </LocalizedClientLink>
  )
}
