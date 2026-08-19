// Stephen Few's bullet graph: track (acceptable range) + filled bar (value) +
// target tick. Conveys actual vs target vs acceptable range in one compact bar,
// replacing the information-poor gauge. Pure divs, no SVG.
export function BulletGauge({
  value,
  max,
  target,
  label,
  unit = "",
}: {
  value: number
  max: number
  target?: number
  label?: string
  unit?: string
}) {
  const capped = max > 0 ? max : 1
  const vPct = Math.max(0, Math.min(100, (value / capped) * 100))
  const tPct = target != null ? Math.max(0, Math.min(100, (target / capped) * 100)) : null

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-ui-fg-subtle w-24 truncate">{label}</span>}
      <div className="relative flex-1 h-3 bg-ui-bg-subtle rounded">
        <div className="h-full bg-ui-fg-interactive rounded" style={{ width: `${vPct}%` }} />
        {tPct != null && (
          <div
            className="absolute top-[-2px] h-[16px] w-[2px] bg-ui-fg-base"
            style={{ left: `${tPct}%` }}
            title={`Target: ${target}${unit}`}
          />
        )}
      </div>
      <span className="text-xs text-ui-fg-subtle w-14 text-right">
        {value}
        {unit}
      </span>
    </div>
  )
}
