import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge, Text, Tabs } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type InsightsData = {
  members: {
    total: number
    pending: number
    approved: number
    applications_submitted: number
  }
  tiers: Record<string, number>
  abandoned_carts: number
  revenue_30d: number
  aov: number
  orders_30d: number
  demotion_risk: number
  catalogue: { low_stock: number; sold_out: number }
  wishlist: {
    top_products: Array<{
      product_id: string
      count: number
      title?: string
      thumbnail?: string | null
    }>
    pending_offers: number
    approved_offers: number
  }
}

const aud = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n || 0)

function Kpi({
  label,
  value,
  sub,
  tone,
  href,
}: {
  label: string
  value: string | number
  sub?: string
  tone?: "default" | "warn" | "danger"
  href?: string
}) {
  const toneCls =
    tone === "danger"
      ? "text-ui-fg-error"
      : tone === "warn"
        ? "text-ui-tag-orange-text"
        : "text-ui-fg-base"
  const inner = (
    <div className="rounded-lg border border-ui-border-base p-4 flex flex-col gap-1 h-full hover:border-ui-border-interactive transition-colors">
      <span className="text-xs text-ui-fg-subtle uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${toneCls}`}>{value}</span>
      {sub && <span className="text-xs text-ui-fg-muted">{sub}</span>}
    </div>
  )
  return href ? (
    <a href={href} className="block">
      {inner}
    </a>
  ) : (
    inner
  )
}

function BarRow({
  label,
  count,
  max,
  color,
}: {
  label: string
  count: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-20 text-ui-fg-subtle">{label}</span>
      <div className="flex-1 bg-ui-bg-subtle rounded h-5 overflow-hidden">
        <div className={`h-full ${color} rounded`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium w-8 text-right">{count}</span>
    </div>
  )
}

const DEMAND_METRICS = [
  "Product views & view→cart rate",
  "Cart abandonment rate",
  "Brewery page view ranking",
  "Most-used store filters & sort options",
  "Hop filter selection counts",
  "Interactions per Untappd rating band",
]

const InsightsPage = () => {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sdk.client
      .fetch<InsightsData>("/admin/insights")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading)
    return (
      <Container>
        <Text>Loading insights…</Text>
      </Container>
    )
  if (!data)
    return (
      <Container>
        <Text>Failed to load insights.</Text>
      </Container>
    )

  const conversionRate =
    data.members.applications_submitted > 0
      ? ((data.members.approved / data.members.applications_submitted) * 100).toFixed(1)
      : "0"

  const tierEntries = Object.entries(data.tiers).sort(([a], [b]) => a.localeCompare(b))
  const tierMax = Math.max(1, ...tierEntries.map(([, c]) => c))

  return (
    <Container>
      <Heading level="h1" className="mb-4">
        Insights
      </Heading>
      <Tabs defaultValue="operations">
        <Tabs.List>
          <Tabs.Trigger value="operations">Operations</Tabs.Trigger>
          <Tabs.Trigger value="demand">Demand &amp; Behaviour</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="operations" className="pt-6 space-y-8">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi
              label="Revenue (30d)"
              value={aud(data.revenue_30d)}
              sub={`${data.orders_30d} orders`}
            />
            <Kpi label="Avg order value" value={aud(data.aov)} sub="Last 30 days" />
            <Kpi
              label="Total members"
              value={data.members.total}
              sub={`${data.members.approved} approved`}
              href="/app/members"
            />
            <Kpi
              label="Pending applications"
              value={data.members.pending}
              sub={`${conversionRate}% approval rate`}
              tone={data.members.pending > 0 ? "warn" : "default"}
              href="/app/members"
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi
              label="Demotion risk"
              value={data.demotion_risk}
              sub="VIPs at risk of demotion"
              tone={data.demotion_risk > 0 ? "warn" : "default"}
            />
            <Kpi
              label="Abandoned carts"
              value={data.abandoned_carts}
              sub="Inactive 24h+ with items"
              tone={data.abandoned_carts > 0 ? "warn" : "default"}
            />
            <Kpi
              label="Low stock"
              value={data.catalogue.low_stock}
              sub="≤ 6 units left"
              tone={data.catalogue.low_stock > 0 ? "warn" : "default"}
              href="/app/products"
            />
            <Kpi
              label="Sold out"
              value={data.catalogue.sold_out}
              sub="0 units available"
              tone={data.catalogue.sold_out > 0 ? "danger" : "default"}
              href="/app/products"
            />
          </div>

          {/* Two-column: tiers + offers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Heading level="h2" className="mb-3">
                VIP tier distribution
              </Heading>
              <div className="space-y-2">
                {tierEntries.length === 0 && (
                  <Text size="small" className="text-ui-fg-muted">
                    No tier data yet.
                  </Text>
                )}
                {tierEntries.map(([tier, count]) => (
                  <BarRow
                    key={tier}
                    label={tier === "none" || tier === "approved" ? "Member" : tier.toUpperCase()}
                    count={count}
                    max={tierMax}
                    color={tier.startsWith("vip") ? "bg-ui-tag-green-icon" : "bg-ui-fg-muted"}
                  />
                ))}
              </div>
            </div>

            <div>
              <Heading level="h2" className="mb-3">
                Buy-at-Price offers
              </Heading>
              <div className="grid grid-cols-3 gap-3">
                <Kpi
                  label="Pending"
                  value={data.wishlist.pending_offers}
                  tone={data.wishlist.pending_offers > 0 ? "warn" : "default"}
                  href="/app/buy-at-price"
                />
                <Kpi
                  label="Approved"
                  value={data.wishlist.approved_offers}
                  href="/app/buy-at-price"
                />
                <Kpi
                  label="Total"
                  value={data.wishlist.pending_offers + data.wishlist.approved_offers}
                />
              </div>
            </div>
          </div>

          {/* Top wishlisted */}
          {data.wishlist.top_products.length > 0 && (
            <div>
              <Heading level="h2" className="mb-3">
                Top wishlisted products
              </Heading>
              <div className="space-y-1">
                {data.wishlist.top_products.map((p, i) => (
                  <a
                    key={p.product_id}
                    href={`/app/products/${p.product_id}`}
                    className="flex items-center gap-3 border-b border-ui-border-base py-2 hover:bg-ui-bg-subtle px-2 rounded"
                  >
                    <span className="text-ui-fg-muted text-sm w-6">#{i + 1}</span>
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-ui-bg-subtle" />
                    )}
                    <span className="text-sm flex-1">{p.title || p.product_id.slice(-12)}</span>
                    <Badge color="blue" size="2xsmall">
                      {p.count} wishlist{p.count > 1 ? "s" : ""}
                    </Badge>
                  </a>
                ))}
              </div>
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="demand" className="pt-6">
          <div className="rounded-lg border border-dashed border-ui-border-base p-8 text-center max-w-xl mx-auto">
            <Heading level="h2" className="mb-2">
              Demand &amp; Behaviour
            </Heading>
            <Text size="small" className="text-ui-fg-subtle mb-4 block">
              These metrics need a storefront event-tracking pipeline (product views, filter usage,
              etc.) that isn't captured yet. Planned once the events layer ships:
            </Text>
            <ul className="text-sm text-ui-fg-base text-left inline-block space-y-1">
              {DEMAND_METRICS.map((m) => (
                <li key={m} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ui-fg-muted inline-block" />
                  {m}
                </li>
              ))}
            </ul>
            <Text size="small" className="text-ui-fg-muted mt-4 block">
              Cart abandonment is already available on the Operations tab.
            </Text>
          </div>
        </Tabs.Content>
      </Tabs>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Insights",
})

export default InsightsPage
