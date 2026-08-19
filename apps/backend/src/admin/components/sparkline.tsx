// Tufte-style sparkline: word-sized graphic, no axes/gridlines, minimal ink.
// Uses currentColor so the stroke follows the surrounding text color token.
export function Sparkline({
  data,
  width = 60,
  height = 20,
  className = "text-ui-fg-interactive",
}: {
  data: number[]
  width?: number
  height?: number
  className?: string
}) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 2
  const stepX = (width - pad * 2) / (data.length - 1)
  const points = data
    .map((v, i) => {
      const x = pad + i * stepX
      const y = height - pad - ((v - min) / range) * (height - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
