import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge, Text, Tabs } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"
import { FunnelBar } from "../../components/funnel-bar"

type CustomerLite = {
  id: string
  email: string
  name: string
  tier: string
}

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
  demand: {
    top_products: Array<{
      product_id: string
      handle: string
      views: number
      cart_adds: number
      view_to_cart_rate: number
    }>
    top_breweries: Array<{ slug: string; views: number }>
    filter_usage: Array<{ filter: string; count: number }>
    hop_counts: Array<{ hop: string; count: number }>
    untappd_bands: Array<{ band: string; views: number }>
  }
  funnel: {
    total_sessions: number
    completed_orders: number
    stages: Array<{
      key: string
      label: string
      count: number
      conversion_rate: number
    }>
  }
  referrals: {
    summary: {
      total_referrals: number
      converted_referrals: number
      stealth_referrals: number
      revenue: number
    }
    top_referrers: Array<{
      referrer_customer_id: string
      referrals: number
      converted_referrals: number
      converted_orders: number
      revenue: number
      stealth_referrals: number
      customer: CustomerLite | null
    }>
  }
  recently_active: Array<{
    customer_id: string
    customer: CustomerLite | null
    last_seen_at: string
    last_path: string | null
  }>
  product_drilldown:
    | {
        customer_id: string | null
        session_id: string | null
        views: number
        cart_adds: number
        last_at: string | null
        customer: CustomerLite | null
      }[]
    | null
  filter_drilldown: {
    values: Array<{ value: string; count: number }>
    members: Array<{
      customer_id: string | null
      session_id: string | null
      uses: number
      values: string[]
      last_at: string | null
      customer: CustomerLite | null
    }>
  } | null
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

function MemberLink({
  customer,
  sessionId,
}: {
  customer: CustomerLite | null
  sessionId?: string | null
}) {
  if (!customer) {
    if (sessionId) {
      return (
        <span className="text-ui-fg-muted" title={sessionId}>
          Anonymous session · {sessionId.slice(0, 8)}
        </span>
      )
    }
    return <span className="text-ui-fg-muted">Unknown member</span>
  }
  return (
    <a href={`/app/members`} className="text-ui-fg-interactive hover:underline">
      {customer.name}
    </a>
  )
}

const InsightsPage = () => {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null)
  const [productDrilldown, setProductDrilldown] = useState<InsightsData["product_drilldown"]>(null)
  const [filterDrilldown, setFilterDrilldown] = useState<InsightsData["filter_drilldown"]>(null)

  useEffect(() => {
    sdk.client
      .fetch<InsightsData>("/admin/insights")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedProductId) {
      setProductDrilldown(null)
      return
    }
    sdk.client
      .fetch<InsightsData>(`/admin/insights?product_id=${encodeURIComponent(selectedProductId)}`)
      .then((response) => setProductDrilldown(response.product_drilldown))
      .catch(() => setProductDrilldown([]))
  }, [selectedProductId])

  useEffect(() => {
    if (!selectedFilter) {
      setFilterDrilldown(null)
      return
    }
    sdk.client
      .fetch<InsightsData>(`/admin/insights?filter=${encodeURIComponent(selectedFilter)}`)
      .then((response) => setFilterDrilldown(response.filter_drilldown))
      .catch(() => setFilterDrilldown({ values: [], members: [] }))
  }, [selectedFilter])

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
  const funnelMax = Math.max(1, ...data.funnel.stages.map((stage) => stage.count))

  return (
    <Container>
      <Heading level="h1" className="mb-4">
        Insights
      </Heading>
      <Tabs defaultValue="operations">
        <Tabs.List>
          <Tabs.Trigger value="operations">Operations</Tabs.Trigger>
          <Tabs.Trigger value="demand">Demand &amp; Behaviour</Tabs.Trigger>
          <Tabs.Trigger value="checkout">Checkout Funnel</Tabs.Trigger>
          <Tabs.Trigger value="referrals">Referrals</Tabs.Trigger>
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

          {/* Recently active members */}
          <div>
            <Heading level="h2" className="mb-3">
              Recently active members
            </Heading>
            <div className="space-y-1">
              {data.recently_active.length === 0 && (
                <Text size="small" className="text-ui-fg-muted">
                  No active sessions in the last 30 days.
                </Text>
              )}
              {data.recently_active.map((row) => (
                <a
                  key={row.customer_id}
                  href="/app/members"
                  className="flex items-center justify-between gap-3 border-b border-ui-border-base py-2 hover:bg-ui-bg-subtle px-2 rounded"
                >
                  <Text size="small">{row.customer?.name ?? row.customer_id.slice(-8)}</Text>
                  <div className="flex items-center gap-2 text-ui-fg-muted text-sm">
                    {row.last_path && (
                      <span className="truncate max-w-[220px]">{row.last_path}</span>
                    )}
                    <Badge size="2xsmall" color="green">
                      {new Date(row.last_seen_at) > new Date(Date.now() - 5 * 60 * 1000)
                        ? "Online now"
                        : new Date(row.last_seen_at).toLocaleString("en-AU", {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                    </Badge>
                  </div>
                </a>
              ))}
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

        <Tabs.Content value="demand" className="pt-6 space-y-8">
          {/* Top products by views */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Heading level="h2" className="mb-3">
                Top products (30d views)
              </Heading>
              {data.demand.top_products.length === 0 ? (
                <Text size="small" className="text-ui-fg-muted">
                  No product view events yet.
                </Text>
              ) : (
                <div className="space-y-1">
                  {data.demand.top_products.map((p, i) => (
                    <button
                      key={p.product_id}
                      type="button"
                      onClick={() => setSelectedProductId(p.product_id)}
                      className="flex w-full items-center gap-3 border-b border-ui-border-base py-2 hover:bg-ui-bg-subtle px-2 rounded text-left"
                    >
                      <span className="text-ui-fg-muted text-sm w-6">#{i + 1}</span>
                      <span className="text-sm flex-1">{p.handle || p.product_id.slice(-10)}</span>
                      <Badge color="blue" size="2xsmall">
                        {p.views} views
                      </Badge>
                      {p.views > 0 && (
                        <Badge
                          color={p.view_to_cart_rate > 0.1 ? "green" : "orange"}
                          size="2xsmall"
                        >
                          {Math.round(p.view_to_cart_rate * 100)}% cart
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Heading level="h2" className="mb-3">
                Top breweries (30d views)
              </Heading>
              {data.demand.top_breweries.length === 0 ? (
                <Text size="small" className="text-ui-fg-muted">
                  No brewery view events yet.
                </Text>
              ) : (
                <div className="space-y-2">
                  {data.demand.top_breweries.map((b, i) => (
                    <div key={b.slug} className="flex items-center gap-3">
                      <span className="text-ui-fg-muted text-sm w-6">#{i + 1}</span>
                      <span className="text-sm flex-1">{b.slug}</span>
                      <Badge color="blue" size="2xsmall">
                        {b.views} views
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Filter usage + hop counts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Heading level="h2" className="mb-3">
                Filter usage (30d)
              </Heading>
              {data.demand.filter_usage.length === 0 ? (
                <Text size="small" className="text-ui-fg-muted">
                  No filter events yet.
                </Text>
              ) : (
                <div className="space-y-2">
                  {data.demand.filter_usage.map((f) => (
                    <button
                      key={f.filter}
                      type="button"
                      onClick={() => setSelectedFilter(f.filter)}
                      className="block w-full text-left"
                    >
                      <BarRow
                        label={f.filter}
                        count={f.count}
                        max={data.demand.filter_usage[0]?.count ?? 1}
                        color="bg-ui-tag-blue-icon"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Heading level="h2" className="mb-3">
                Hop filter picks (30d)
              </Heading>
              {data.demand.hop_counts.length === 0 ? (
                <Text size="small" className="text-ui-fg-muted">
                  No hop filter events yet.
                </Text>
              ) : (
                <div className="space-y-2">
                  {data.demand.hop_counts.map((h) => (
                    <BarRow
                      key={h.hop}
                      label={h.hop}
                      count={h.count}
                      max={data.demand.hop_counts[0]?.count ?? 1}
                      color="bg-ui-tag-green-icon"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Untappd rating band distribution */}
          {data.demand.untappd_bands.length > 0 && (
            <div>
              <Heading level="h2" className="mb-3">
                Views by Untappd rating band (30d)
              </Heading>
              <div className="space-y-2 max-w-lg">
                {data.demand.untappd_bands.map((b) => (
                  <BarRow
                    key={b.band}
                    label={b.band}
                    count={b.views}
                    max={Math.max(...data.demand.untappd_bands.map((x) => x.views))}
                    color="bg-ui-tag-orange-icon"
                  />
                ))}
              </div>
            </div>
          )}

          {selectedProductId && (
            <div>
              <Heading level="h2" className="mb-3">
                Product drill-down
              </Heading>
              <div className="space-y-2">
                {(productDrilldown ?? []).map((row) => (
                  <div
                    key={row.customer_id ?? row.session_id ?? `${row.last_at}`}
                    className="flex items-center justify-between gap-3 border-b border-ui-border-base py-2"
                  >
                    <MemberLink customer={row.customer} sessionId={row.session_id} />
                    <div className="flex items-center gap-2 text-sm text-ui-fg-subtle">
                      <Badge color="blue" size="2xsmall">
                        {row.views} views
                      </Badge>
                      <Badge color="green" size="2xsmall">
                        {row.cart_adds} cart adds
                      </Badge>
                    </div>
                  </div>
                ))}
                {(productDrilldown ?? []).length === 0 && (
                  <Text size="small" className="text-ui-fg-muted">
                    No member activity for this product yet.
                  </Text>
                )}
              </div>
            </div>
          )}

          {selectedFilter && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Heading level="h2" className="mb-3">
                  Filter values
                </Heading>
                <div className="space-y-2">
                  {(filterDrilldown?.values ?? []).map((value) => (
                    <BarRow
                      key={value.value}
                      label={value.value}
                      count={value.count}
                      max={filterDrilldown?.values[0]?.count ?? 1}
                      color="bg-ui-tag-orange-icon"
                    />
                  ))}
                </div>
              </div>
              <div>
                <Heading level="h2" className="mb-3">
                  Members using this filter
                </Heading>
                <div className="space-y-2">
                  {(filterDrilldown?.members ?? []).map((member) => (
                    <div
                      key={member.customer_id ?? member.session_id ?? member.values.join(",")}
                      className="flex items-center justify-between gap-3 border-b border-ui-border-base py-2"
                    >
                      <div>
                        <MemberLink customer={member.customer} sessionId={member.session_id} />
                        <Text size="small" className="text-ui-fg-muted">
                          {member.values.join(", ")}
                        </Text>
                      </div>
                      <Badge color="blue" size="2xsmall">
                        {member.uses} uses
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="checkout" className="pt-6 space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Tracked sessions" value={data.funnel.total_sessions} />
            <Kpi
              label="Order placed rate"
              value={`${data.funnel.stages.find((s) => s.key === "placed")?.conversion_rate ?? 0}%`}
            />
            <Kpi
              label="Payment confirmed rate"
              value={`${data.funnel.stages[data.funnel.stages.length - 1]?.conversion_rate ?? 0}%`}
            />
            <Kpi label="Completed orders" value={data.funnel.completed_orders} />
          </div>
          <Text size="small" className="text-ui-fg-muted">
            "Order placed" fires the instant checkout succeeds. "Payment confirmed" depends on
            manual capture (PayID / cash-on-pickup) and will naturally lag — a gap here is expected,
            not a broken funnel.
          </Text>

          <div>
            <Heading level="h2" className="mb-3">
              Checkout funnel
            </Heading>
            <div className="space-y-3">
              {data.funnel.stages.map((stage) => (
                <FunnelBar
                  key={stage.key}
                  label={stage.label}
                  count={stage.count}
                  total={funnelMax}
                  rate={stage.conversion_rate}
                />
              ))}
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="referrals" className="pt-6 space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Referrals" value={data.referrals.summary.total_referrals} />
            <Kpi label="Converted referrals" value={data.referrals.summary.converted_referrals} />
            <Kpi label="Stealth referrals" value={data.referrals.summary.stealth_referrals} />
            <Kpi label="Referral revenue" value={aud(data.referrals.summary.revenue)} />
          </div>

          <div>
            <Heading level="h2" className="mb-3">
              Top referrers
            </Heading>
            <div className="space-y-2">
              {data.referrals.top_referrers.map((row) => (
                <div
                  key={row.referrer_customer_id}
                  className="flex items-center justify-between gap-3 border-b border-ui-border-base py-2"
                >
                  <div>
                    <MemberLink customer={row.customer} />
                    <Text size="small" className="text-ui-fg-muted">
                      {row.converted_referrals}/{row.referrals} converted
                    </Text>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color="blue" size="2xsmall">
                      {row.converted_orders} orders
                    </Badge>
                    <Badge color="green" size="2xsmall">
                      {aud(row.revenue)}
                    </Badge>
                  </div>
                </div>
              ))}
              {data.referrals.top_referrers.length === 0 && (
                <Text size="small" className="text-ui-fg-muted">
                  No referral conversions yet.
                </Text>
              )}
            </div>
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
