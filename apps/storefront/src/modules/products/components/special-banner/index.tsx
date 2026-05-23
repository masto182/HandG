import type { ActiveSpecial } from "@lib/data/specials"
import SpecialCountdown from "@modules/products/components/special-countdown"

export default function SpecialBanner({
  special,
}: {
  special: ActiveSpecial | null
}) {
  if (!special) return null

  const discountLabel =
    special.discount_type === "percentage"
      ? `${special.discount_value}% off`
      : `$${special.discount_value} off`

  const typeLabel =
    special.type === "vip_exclusive"
      ? "VIP Exclusive"
      : special.type === "aging_markdown"
      ? "Clearance"
      : "Flash Sale"

  return (
    <div className="w-full px-4 py-3 mb-4 border-l-4 border-amber-500 bg-amber-900/10 rounded-r-lg flex items-center justify-between gap-4">
      <p className="text-sm font-medium text-amber-200">
        {typeLabel}: {discountLabel} — {special.title}
      </p>
      {special.ends_at && <SpecialCountdown endsAt={special.ends_at} variant="pill" />}
    </div>
  )
}
