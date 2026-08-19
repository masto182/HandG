import { Text } from "@medusajs/ui"

export type MatrixPoint = {
  id: string
  label: string
  x: number // exposure (views)
  y: number // conversion/intent (view-to-cart rate, 0-100)
  hover?: string
}

// Demand-vs-sales scatter. NN/g: 2D position is a preattentively-accurate channel
// (unlike area/angle). Plots each product's exposure (x) against its conversion
// (y) so high-exposure/low-conversion products fall into the bottom-right —
// the "seen but not bought" quadrant that needs attention.
//
// All fills/strokes use currentColor with confirmed-valid text-ui-* tokens on
// parent groups (avoids depending on fill-*/stroke-* utilities the preset may
// not generate).
export function DemandMatrix({
  points,
  width = 360,
  height = 220,
}: {
  points: MatrixPoint[]
  width?: number
  height?: number
}) {
  const pad = { l: 46, r: 12, t: 12, b: 30 }
  const innerW = width - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  const maxX = Math.max(1, ...points.map((p) => p.x))
  const maxY = Math.max(1, ...points.map((p) => p.y), 100)

  const toX = (x: number) => pad.l + (x / maxX) * innerW
  const toY = (y: number) => pad.t + (1 - y / maxY) * innerH
  const midY = toY(50)

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxX * t))

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="max-w-full text-ui-fg-muted"
        role="img"
        aria-label="Demand vs conversion scatter"
      >
        {/* gridlines + axes labels (muted) */}
        <g className="text-ui-fg-muted">
          {[0, 25, 50, 75, 100].map((v) => {
            const y = toY(v)
            return (
              <g key={v}>
                <line
                  x1={pad.l}
                  x2={width - pad.r}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  opacity={0.4}
                />
                <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={10} fill="currentColor">
                  {v}%
                </text>
              </g>
            )
          })}
          <text x={2} y={pad.t - 4} fontSize={10} fill="currentColor">
            conversion
          </text>
          {ticks.map((t) => (
            <text
              key={t}
              x={toX(t)}
              y={height - 10}
              textAnchor="middle"
              fontSize={10}
              fill="currentColor"
            >
              {t}
            </text>
          ))}
          <text x={width / 2} y={height - 1} textAnchor="middle" fontSize={10} fill="currentColor">
            views (exposure)
          </text>
        </g>

        {/* quadrant guide at 50% conversion */}
        <line
          x1={pad.l}
          x2={width - pad.r}
          y1={midY}
          y2={midY}
          className="text-ui-fg-interactive"
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.5}
        />

        {/* points */}
        <g className="text-ui-fg-interactive">
          {points.map((p) => (
            <g key={p.id}>
              <title>
                {p.label}: {p.x} views · {p.y.toFixed(1)}% conversion
                {p.hover ? ` · ${p.hover}` : ""}
              </title>
              <circle cx={toX(p.x)} cy={toY(p.y)} r={4} fill="currentColor" />
            </g>
          ))}
        </g>
      </svg>
      {points.length === 0 && (
        <Text size="small" className="text-ui-fg-muted">
          No product data yet.
        </Text>
      )}
    </div>
  )
}
