import { Link } from "react-router-dom"
import { Sparkline } from "./sparkline"

// Stripe-style metric card: one dominant number + comparison delta + sparkline.
// Comparison-first: the delta vs prior period is shown before the absolute value
// is dwelled on (Shopify/Klaviyo/Square merchant-dashboard convention).
export function MetricCard({
  label,
  value,
  sub,
  deltaPct,
  spark,
  href,
}: {
  label: string
  value: string
  sub?: string
  deltaPct?: number | null
  spark?: number[]
  href?: string
}) {
  // Green then only ever means "up/good", red "down/bad" — state, not decoration.
  const deltaClass =
    deltaPct == null
      ? "text-ui-fg-muted"
      : deltaPct >= 0
        ? "text-ui-tag-green-text"
        : "text-ui-tag-red-text"
  const arrow = deltaPct == null ? "" : deltaPct >= 0 ? "↑" : "↓"

  const inner = (
    <div className="rounded-lg border border-ui-border-base p-4 flex flex-col gap-2 h-full hover:border-ui-border-interactive transition-colors">
      <span className="text-xs text-ui-fg-subtle uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-ui-fg-base">{value}</span>
        {deltaPct != null && (
          <span className={`text-xs font-semibold ${deltaClass}`}>
            {arrow}
            {Math.abs(deltaPct)}%
          </span>
        )}
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 pt-1">
        <div className="min-w-0">
          {sub && <span className="block text-xs text-ui-fg-muted">{sub}</span>}
          {deltaPct != null && (
            <span className="block text-[10px] text-ui-fg-muted">vs prior period</span>
          )}
        </div>
        {spark && <Sparkline data={spark} />}
      </div>
    </div>
  )

  return href ? (
    <Link to={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  )
}
