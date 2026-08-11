type FunnelBarProps = {
  label: string
  count: number
  total: number
  rate: number
  labelClassName?: string
  countClassName?: string
  rateClassName?: string
}

export function FunnelBar({
  label,
  count,
  total,
  rate,
  labelClassName = "w-32",
  countClassName = "w-10",
  rateClassName = "w-14",
}: FunnelBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs text-ui-fg-subtle ${labelClassName}`}>{label}</span>
      <div className="flex-1 bg-ui-bg-subtle rounded h-5 overflow-hidden">
        <div className="h-full bg-ui-fg-interactive rounded" style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-medium text-right ${countClassName}`}>{count}</span>
      <span className={`text-xs text-right text-ui-fg-subtle ${rateClassName}`}>{rate}%</span>
    </div>
  )
}
