import { Badge, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"

type Severity = "high" | "medium" | "low"

// Exception-based row (Stephen Few): surface the deviation, its magnitude as a
// bar (length, not color-coded number), and a drill-down. Color only conveys
// severity class and is always paired with a label.
const SEVERITY_BADGE: Record<Severity, "red" | "orange" | "green"> = {
  high: "red",
  medium: "orange",
  low: "green",
}

const SEVERITY_BAR: Record<Severity, string> = {
  high: "bg-ui-tag-red-icon",
  medium: "bg-ui-tag-orange-icon",
  low: "bg-ui-tag-green-icon",
}

export function ExceptionRow({
  title,
  detail,
  severity,
  magnitude,
  magnitudeLabel,
  href,
  maxMagnitude,
}: {
  title: string
  detail: string
  severity: Severity
  magnitude: number
  magnitudeLabel: string
  href?: string
  maxMagnitude?: number
}) {
  const max = maxMagnitude && maxMagnitude > 0 ? maxMagnitude : magnitude
  const pct = Math.max(2, Math.min(100, Math.round((magnitude / max) * 100)))

  const inner = (
    <div className="flex items-center gap-3 px-2 py-2.5 rounded border-b border-ui-border-base last:border-b-0 hover:bg-ui-bg-subtle transition-colors">
      <Badge color={SEVERITY_BADGE[severity]} size="2xsmall">
        {severity}
      </Badge>
      <div className="flex-1 min-w-0">
        <Text size="small" weight="plus" className="truncate">
          {title}
        </Text>
        <Text size="small" className="text-ui-fg-muted truncate">
          {detail}
        </Text>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-20 bg-ui-bg-subtle rounded h-2 overflow-hidden">
          <div
            className={`h-full ${SEVERITY_BAR[severity]} rounded`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-ui-fg-subtle w-32 text-right truncate">{magnitudeLabel}</span>
      </div>
    </div>
  )

  return href ? (
    <Link to={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )
}
