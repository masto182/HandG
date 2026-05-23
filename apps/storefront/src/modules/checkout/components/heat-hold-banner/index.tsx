type Props = {
  enabled: boolean
  message?: string
}

/**
 * Server component banner shown above the place-order CTA when heat hold
 * is active. Hidden when disabled.
 */
export default function HeatHoldBanner({ enabled, message }: Props) {
  if (!enabled) return null
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="heat-hold-banner"
      className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-4 text-sm leading-relaxed"
    >
      <p className="font-semibold">Heat hold is active</p>
      <p>
        {message ??
          "Forecast heat is high. Orders are queued and will dispatch on the next safe day."}
      </p>
    </div>
  )
}
