import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge, Text, Tabs, Table } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { sdk } from "../../lib/sdk"
import { FunnelBar } from "../../components/funnel-bar"
import { MetricCard } from "../../components/metric-card"
import { ExceptionRow } from "../../components/exception-row"
import { BulletGauge } from "../../components/bullet-gauge"
import { DemandMatrix } from "../../components/demand-matrix"

type CustomerLite = {
  id: string
  email: string
  name: string
  tier: string
}

type AttentionAction = {
  id: string
  severity: "high" | "medium" | "low"
  title: string
  detail: string
  magnitude: number
  magnitude_label: string
  href?: string
}

type OperateRow = {
  product_id: string
  sold: number
  on_hand: number
  weeks_of_supply: number
  status: "out" | "reorder" | "healthy" | "no_sales"
  title: string | null
  brewery_name: string | null
  handle: string
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
  abandoned_cart_details: Array<{
    cart_id: string
    customer_id: string | null
    customer: CustomerLite | null
    email: string | null
    item_count: number
    items: Array<{ title: string; quantity: number }>
    updated_at: string
    last_stage: string | null
  }>
  revenue_30d: number
  revenue_delta_pct: number | null
  aov: number
  orders_30d: number
  demotion_risk: number
  catalogue: { low_stock: number; sold_out: number }
  operate: OperateRow[]
  attention: AttentionAction[]
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
      title: string | null
      brewery_name: string | null
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
  search_intent: Array<{
    query: string
    submissions: number
    result_clicks: number
    click_through: number
    avg_results: number
    zero_results: number
  }>
  interesting_products: Array<{
    product_id: string
    handle: string
    views: number
    cart_adds: number
    view_to_cart_rate: number
  }>
  data: { through: string | null; events: number }
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
  product_drilldown: Array<{
    customer_id: string | null
    session_id: string | null
    views: number
    cart_adds: number
    last_at: string | null
    customer: CustomerLite | null
  }> | null
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
  funnel_stage_drilldown: Array<{
    session_id: string
    customer_id: string
    max_stage: string
    outcome: string
    fulfilment_method: "pickup" | "delivery" | null
    started_at: string | null
    last_at: string | null
    customer: CustomerLite | null
  }> | null
  sell_through: {
    overall_avg_days: number | null
    sample_size: number
    by_brewery: Array<{ label: string; avg_days: number; count: number }>
    by_hop: Array<{ label: string; avg_days: number; count: number }>
    by_abv_band: Array<{ label: string; avg_days: number; count: number }>
    by_collab: Array<{ label: string; avg_days: number; count: number }>
  }
  buyer_segmentation: {
    premium: { customers: number; revenue: number; sample: CustomerLite[] }
    bargain: { customers: number; revenue: number; sample: CustomerLite[] }
    window_days: number
    method_note: string
  }
}

const aud = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n || 0)

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
      <span className="text-xs w-24 truncate text-ui-fg-subtle">{label}</span>
      <div className="flex-1 bg-ui-bg-subtle rounded h-5 overflow-hidden">
        <div className={`h-full ${color} rounded`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium w-8 text-right">{count}</span>
    </div>
  )
}

function SellThroughList({
  title,
  rows,
}: {
  title: string
  rows: Array<{ label: string; avg_days: number; count: number }>
}) {
  return (
    <div>
      <Text size="small" weight="plus" className="mb-2 block">
        {title}
      </Text>
      {rows.length === 0 ? (
        <Text size="small" className="text-ui-fg-muted">
          Not enough data yet.
        </Text>
      ) : (
        <div className="space-y-1">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 text-sm py-1">
              <span className="flex-1 truncate">{r.label}</span>
              <Badge size="2xsmall" color="blue">
                {r.avg_days}d
              </Badge>
              <span className="text-xs text-ui-fg-muted w-16 text-right">
                {r.count} beer{r.count === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}
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
    return (
      <span className="text-ui-fg-muted" title={sessionId ?? undefined}>
        {sessionId ? `Anonymous session · ${sessionId.slice(0, 8)}` : "Unknown member"}
      </span>
    )
  }
  return (
    <Link
      to={`/members?id=${encodeURIComponent(customer.id)}`}
      className="text-ui-fg-interactive hover:underline"
    >
      {customer.name}
    </Link>
  )
}

const OPERATE_STATUS: Record<
  OperateRow["status"],
  { badge: "red" | "orange" | "green" | "grey"; label: string }
> = {
  out: { badge: "red", label: "Out of stock" },
  reorder: { badge: "orange", label: "Reorder" },
  no_sales: { badge: "grey", label: "No sales (30d)" },
  healthy: { badge: "green", label: "Healthy" },
}

const InsightsPage = () => {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null)
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<string | null>(null)
  const [productDrilldown, setProductDrilldown] = useState<InsightsData["product_drilldown"]>(null)
  const [filterDrilldown, setFilterDrilldown] = useState<InsightsData["filter_drilldown"]>(null)
  const [funnelStageDrilldown, setFunnelStageDrilldown] =
    useState<InsightsData["funnel_stage_drilldown"]>(null)

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

  useEffect(() => {
    if (!selectedFunnelStage) {
      setFunnelStageDrilldown(null)
      return
    }
    sdk.client
      .fetch<InsightsData>(
        `/admin/insights?funnel_stage=${encodeURIComponent(selectedFunnelStage)}`
      )
      .then((response) => setFunnelStageDrilldown(response.funnel_stage_drilldown))
      .catch(() => setFunnelStageDrilldown([]))
  }, [selectedFunnelStage])

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

  const tierEntries = Object.entries(data.tiers).sort(([a], [b]) => a.localeCompare(b))
  const tierMax = Math.max(1, ...tierEntries.map(([, c]) => c))
  const funnelMax = Math.max(1, ...data.funnel.stages.map((stage) => stage.count))
  const attentionMax = Math.max(1, ...data.attention.map((a) => a.magnitude))
  const lastPlaced = data.funnel.stages[data.funnel.stages.length - 1]

  // Demand matrix: exposure (views) vs conversion (view-to-cart rate).
  const matrixPoints = data.demand.top_products
    .filter((p) => p.views > 0)
    .slice(0, 12)
    .map((p) => ({
      id: p.product_id,
      label: p.title ?? p.handle ?? p.product_id.slice(-10),
      x: p.views,
      y: p.view_to_cart_rate * 100,
    }))

  // 30-day revenue sparkline is not persisted as a series; derive from nothing here,
  // so pass undefined unless we later add a series. Keep the card comparison-first.
  const revenueCard = {
    label: "Revenue (30d)",
    value: aud(data.revenue_30d),
    sub: `${data.orders_30d} orders`,
    deltaPct: data.revenue_delta_pct,
  }

  return (
    <Container>
      <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
        <Heading level="h1">Insights</Heading>
        {/* Data Health strip — persistent, never a tab (Few: trust before metrics) */}
        <div className="flex items-center gap-2 text-xs text-ui-fg-muted">
          <Badge size="2xsmall" color={data.data.through ? "green" : "grey"}>
            {data.data.through ? "Live" : "No data"}
          </Badge>
          <span>
            Data through{" "}
            {data.data.through
              ? new Date(data.data.through).toLocaleString("en-AU", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "—"}
            {data.data.through &&
            data.data.through < new Date(Date.now() - 24 * 3600e3).toISOString()
              ? " · STALE"
              : null}
          </span>
          <span className="text-ui-fg-muted">·</span>
          <span>{data.data.events} events (30d)</span>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="operate">Operate</Tabs.Trigger>
          <Tabs.Trigger value="demand">Demand</Tabs.Trigger>
          <Tabs.Trigger value="funnel">Funnel</Tabs.Trigger>
          <Tabs.Trigger value="members">Members</Tabs.Trigger>
          <Tabs.Trigger value="referrals">Referrals</Tabs.Trigger>
        </Tabs.List>

        {/* ============ OVERVIEW ============ */}
        <Tabs.Content value="overview" className="pt-6 space-y-8">
          {/* Headline metrics — comparison-first */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label={revenueCard.label}
              value={revenueCard.value}
              sub={revenueCard.sub}
              deltaPct={revenueCard.deltaPct}
            />
            <MetricCard label="Avg order value" value={aud(data.aov)} sub="Last 30 days" />
            <MetricCard
              label="Total members"
              value={String(data.members.total)}
              sub={`${data.members.approved} approved`}
              href="/members"
            />
            <MetricCard
              label="Abandoned carts"
              value={String(data.abandoned_carts)}
              sub="Inactive 24h+ with items"
              deltaPct={data.abandoned_carts > 0 ? 0 : null}
            />
          </div>

          {/* Who's abandoning, and at what checkout stage */}
          <div>
            <Heading level="h2" className="mb-2">
              Abandoned carts — who and where
            </Heading>
            <Text size="small" className="text-ui-fg-muted mb-3">
              Carts with items, untouched for 24h+, not completed. "Last stage" is the furthest
              checkout step we tracked for that cart — blank means they never started checkout.
            </Text>
            <div className="rounded-lg border border-ui-border-base overflow-hidden">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Member</Table.HeaderCell>
                    <Table.HeaderCell>Items</Table.HeaderCell>
                    <Table.HeaderCell>Last stage</Table.HeaderCell>
                    <Table.HeaderCell>Last updated</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {data.abandoned_cart_details.length === 0 && (
                    <Table.Row>
                      <Table.Cell>
                        <Text size="small" className="text-ui-fg-muted">
                          No abandoned carts right now.
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  )}
                  {data.abandoned_cart_details.map((cart) => (
                    <Table.Row key={cart.cart_id}>
                      <Table.Cell>
                        {cart.customer ? (
                          <MemberLink customer={cart.customer} sessionId={null} />
                        ) : (
                          <span className="text-ui-fg-muted">{cart.email ?? "Guest"}</span>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-sm text-ui-fg-subtle">
                          {cart.items.map((i) => `${i.quantity}× ${i.title}`).join(", ")}
                          {cart.item_count > cart.items.length &&
                            ` +${cart.item_count - cart.items.length} more`}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        {cart.last_stage ? (
                          <Badge color="orange" size="2xsmall">
                            {cart.last_stage}
                          </Badge>
                        ) : (
                          <span className="text-ui-fg-muted text-sm">Never started checkout</span>
                        )}
                      </Table.Cell>
                      <Table.Cell className="text-sm text-ui-fg-subtle">
                        {new Date(cart.updated_at).toLocaleString()}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </div>

          {/* Attention Queue — decisions, not data */}
          <div>
            <Heading level="h2" className="mb-2">
              What needs attention
            </Heading>
            <div className="rounded-lg border border-ui-border-base px-1 py-1">
              {data.attention.length === 0 && (
                <div className="px-2 py-4 text-center">
                  <Text size="small" className="text-ui-fg-muted">
                    Nothing needs attention right now. 🎉
                  </Text>
                </div>
              )}
              {data.attention.map((action) => (
                <ExceptionRow
                  key={action.id}
                  title={action.title}
                  detail={action.detail}
                  severity={action.severity}
                  magnitude={action.magnitude}
                  magnitudeLabel={action.magnitude_label}
                  maxMagnitude={attentionMax}
                  href={action.href}
                />
              ))}
            </div>
          </div>

          {/* Secondary reference, below the fold */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    href="/members"
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
          </div>
        </Tabs.Content>

        {/* ============ OPERATE ============ */}
        <Tabs.Content value="operate" className="pt-6 space-y-6">
          <Heading level="h2" className="mb-2">
            Stock & reorder
          </Heading>
          <Text size="small" className="text-ui-fg-muted">
            Weeks of supply = on-hand ÷ average weekly sales (30d). Below ~12 weeks flags a reorder;
            an empty shelf waits for no one.
          </Text>
          <div className="rounded-lg border border-ui-border-base overflow-hidden">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Brewery</Table.HeaderCell>
                  <Table.HeaderCell>Beer</Table.HeaderCell>
                  <Table.HeaderCell>Sold (30d)</Table.HeaderCell>
                  <Table.HeaderCell>On hand</Table.HeaderCell>
                  <Table.HeaderCell>Weeks of supply</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.operate.length === 0 && (
                  <Table.Row>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-muted">
                        No product data yet.
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                )}
                {data.operate.slice(0, 40).map((row) => {
                  const status = OPERATE_STATUS[row.status]
                  return (
                    <Table.Row key={row.product_id}>
                      <Table.Cell className="text-ui-fg-subtle">
                        {row.brewery_name ?? "—"}
                      </Table.Cell>
                      <Table.Cell>
                        <a
                          href={`/products/${row.product_id}`}
                          className="text-ui-fg-interactive hover:underline"
                        >
                          {row.title ?? row.handle ?? row.product_id.slice(-10)}
                        </a>
                      </Table.Cell>
                      <Table.Cell>{row.sold}</Table.Cell>
                      <Table.Cell>{row.on_hand}</Table.Cell>
                      <Table.Cell>
                        {row.weeks_of_supply >= 99 ? "—" : `${row.weeks_of_supply} wks`}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={status.badge} size="2xsmall">
                          {status.label}
                        </Badge>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table>
          </div>

          <div>
            <Heading level="h2" className="mb-2">
              Sell-through velocity — "days on shelf"
            </Heading>
            <Text size="small" className="text-ui-fg-muted mb-3">
              Days between listing and last sale, for beers that have actually sold out
              (still-in-stock beers aren't included — their shelf life isn't finished yet). Lower is
              better: it sold fast, time to reorder. Based on {data.sell_through.sample_size}{" "}
              sold-out beer
              {data.sell_through.sample_size === 1 ? "" : "s"} in the last year.
            </Text>
            {data.sell_through.sample_size === 0 ? (
              <Text size="small" className="text-ui-fg-muted">
                No sold-out beers with a recorded sale yet.
              </Text>
            ) : (
              <>
                <div className="mb-4">
                  <MetricCard
                    label="Overall average"
                    value={`${data.sell_through.overall_avg_days} days`}
                    sub={`across ${data.sell_through.sample_size} sold-out beers`}
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SellThroughList title="By brewery" rows={data.sell_through.by_brewery} />
                  <SellThroughList title="By hop" rows={data.sell_through.by_hop} />
                  <SellThroughList title="By ABV band" rows={data.sell_through.by_abv_band} />
                  <SellThroughList title="Solo vs collab" rows={data.sell_through.by_collab} />
                </div>
              </>
            )}
          </div>
        </Tabs.Content>

        {/* ============ DEMAND ============ */}
        <Tabs.Content value="demand" className="pt-6 space-y-8">
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
                      <span className="text-sm flex-1 truncate">
                        {p.brewery_name && (
                          <span className="text-ui-fg-subtle">{p.brewery_name} · </span>
                        )}
                        {p.title ?? p.handle ?? p.product_id.slice(-10)}
                      </span>
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
                Demand vs conversion
              </Heading>
              <Text size="small" className="text-ui-fg-muted mb-2">
                Products with lots of views but weak conversion fall bottom-right — seen but not
                bought.
              </Text>
              <DemandMatrix points={matrixPoints} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            <div>
              <Heading level="h2" className="mb-3">
                Search intent
              </Heading>
              {data.search_intent.length === 0 ? (
                <Text size="small" className="text-ui-fg-muted">
                  No search events yet.
                </Text>
              ) : (
                <div className="space-y-2">
                  {data.search_intent.slice(0, 8).map((s) => (
                    <div key={s.query} className="flex items-center gap-3">
                      <span className="text-xs flex-1 truncate text-ui-fg-subtle">{s.query}</span>
                      <Badge
                        color={
                          s.zero_results > 0 ? "red" : s.click_through === 0 ? "orange" : "grey"
                        }
                        size="2xsmall"
                      >
                        {s.zero_results > 0
                          ? "no results"
                          : `${s.result_clicks}/${s.submissions} clicked`}
                      </Badge>
                      <span className="text-xs text-ui-fg-muted w-8 text-right">
                        {s.submissions}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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

        {/* ============ FUNNEL ============ */}
        <Tabs.Content value="funnel" className="pt-6 space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Tracked sessions" value={String(data.funnel.total_sessions)} />
            <MetricCard
              label="Order placed rate"
              value={`${data.funnel.stages.find((s) => s.key === "placed")?.conversion_rate ?? 0}%`}
            />
            <MetricCard
              label="Payment confirmed rate"
              value={`${lastPlaced?.conversion_rate ?? 0}%`}
            />
            <MetricCard
              label="Completed orders"
              value={String(data.funnel.completed_orders)}
              sub="Payment confirmed"
            />
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
            <div className="space-y-3 max-w-3xl">
              {data.funnel.stages.map((stage) => (
                <FunnelBar
                  key={stage.key}
                  label={stage.label}
                  count={stage.count}
                  total={funnelMax}
                  rate={stage.conversion_rate}
                  active={selectedFunnelStage === stage.key}
                  onClick={() =>
                    setSelectedFunnelStage((current) => (current === stage.key ? null : stage.key))
                  }
                />
              ))}
            </div>
            {selectedFunnelStage && (
              <div className="mt-4 max-w-3xl">
                <Heading level="h2" className="mb-3">
                  Dropped at "{data.funnel.stages.find((s) => s.key === selectedFunnelStage)?.label}
                  "
                </Heading>
                <Text size="small" className="text-ui-fg-muted mb-3">
                  Sessions that reached this stage and never progressed further (excludes sessions
                  that went on to place or complete an order).
                </Text>
                <div className="space-y-2">
                  {(funnelStageDrilldown ?? []).map((row) => (
                    <div
                      key={row.session_id}
                      className="flex items-center justify-between gap-3 border-b border-ui-border-base py-2"
                    >
                      <MemberLink customer={row.customer} sessionId={row.session_id} />
                      <div className="flex items-center gap-2 text-sm text-ui-fg-subtle">
                        {row.fulfilment_method && (
                          <Badge color="grey" size="2xsmall">
                            {row.fulfilment_method}
                          </Badge>
                        )}
                        <Text size="xsmall" className="text-ui-fg-muted">
                          {row.last_at ? new Date(row.last_at).toLocaleString() : "—"}
                        </Text>
                      </div>
                    </div>
                  ))}
                  {(funnelStageDrilldown ?? []).length === 0 && (
                    <Text size="small" className="text-ui-fg-muted">
                      No dropped sessions at this stage in the lookback window.
                    </Text>
                  )}
                </div>
              </div>
            )}
            <Heading level="h2" className="mt-8 mb-3">
              Stage conversion — numerator/denominator
            </Heading>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl">
              {data.funnel.stages
                .filter((s) => s.key !== "cart")
                .map((stage) => {
                  const prev =
                    data.funnel.stages[data.funnel.stages.findIndex((x) => x.key === stage.key) - 1]
                  return (
                    <BulletGauge
                      key={stage.key}
                      label={stage.label}
                      value={stage.count}
                      target={prev ? Math.round(prev.count * 0.8) : undefined}
                      max={data.funnel.stages[0]?.count ?? 1}
                    />
                  )
                })}
            </div>
          </div>
        </Tabs.Content>

        {/* ============ MEMBERS ============ */}
        <Tabs.Content value="members" className="pt-6 space-y-8">
          <Heading level="h2" className="mb-2">
            Member activity
          </Heading>
          <Text size="small" className="text-ui-fg-muted">
            Who is browsing vs buying. View per-member history from the Members page.
          </Text>
          <div>
            <Heading level="h2" className="mb-3">
              Recently active
            </Heading>
            <div className="rounded-lg border border-ui-border-base overflow-hidden">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Member</Table.HeaderCell>
                    <Table.HeaderCell>Last path</Table.HeaderCell>
                    <Table.HeaderCell>Last seen</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {data.recently_active.map((row) => (
                    <Table.Row key={row.customer_id}>
                      <Table.Cell>
                        <MemberLink customer={row.customer} />
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-ui-fg-muted truncate max-w-[240px] inline-block">
                          {row.last_path ?? "—"}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
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
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </div>

          <div>
            <Heading level="h2" className="mb-2">
              Buyer type — premium vs bargain
            </Heading>
            <Text size="small" className="text-ui-fg-muted mb-3">
              {data.buyer_segmentation.method_note} Window: last{" "}
              {data.buyer_segmentation.window_days} days.
            </Text>
            <div className="grid grid-cols-2 gap-4 max-w-lg mb-4">
              <MetricCard
                label="Premium buyers"
                value={String(data.buyer_segmentation.premium.customers)}
                sub={`${aud(data.buyer_segmentation.premium.revenue)} revenue`}
              />
              <MetricCard
                label="Bargain buyers"
                value={String(data.buyer_segmentation.bargain.customers)}
                sub={`${aud(data.buyer_segmentation.bargain.revenue)} revenue`}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Text size="small" weight="plus" className="mb-2 block">
                  Premium buyers (sample)
                </Text>
                <div className="space-y-1">
                  {data.buyer_segmentation.premium.sample.map((c) => (
                    <div key={c.id} className="text-sm py-1 border-b border-ui-border-base">
                      <MemberLink customer={c} />
                    </div>
                  ))}
                  {data.buyer_segmentation.premium.sample.length === 0 && (
                    <Text size="small" className="text-ui-fg-muted">
                      No qualifying orders in this window.
                    </Text>
                  )}
                </div>
              </div>
              <div>
                <Text size="small" weight="plus" className="mb-2 block">
                  Bargain buyers (sample)
                </Text>
                <div className="space-y-1">
                  {data.buyer_segmentation.bargain.sample.map((c) => (
                    <div key={c.id} className="text-sm py-1 border-b border-ui-border-base">
                      <MemberLink customer={c} />
                    </div>
                  ))}
                  {data.buyer_segmentation.bargain.sample.length === 0 && (
                    <Text size="small" className="text-ui-fg-muted">
                      No qualifying orders in this window.
                    </Text>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <Heading level="h2" className="mb-3">
              Buy-at-Price offers
            </Heading>
            <div className="grid grid-cols-3 gap-3 max-w-lg">
              <MetricCard
                label="Pending"
                value={String(data.wishlist.pending_offers)}
                deltaPct={data.wishlist.pending_offers > 0 ? 0 : null}
                href="/buy-at-price"
              />
              <MetricCard
                label="Approved"
                value={String(data.wishlist.approved_offers)}
                href="/buy-at-price"
              />
              <MetricCard
                label="Total"
                value={String(data.wishlist.pending_offers + data.wishlist.approved_offers)}
              />
            </div>
          </div>
        </Tabs.Content>

        {/* ============ REFERRALS ============ */}
        <Tabs.Content value="referrals" className="pt-6 space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Referrals" value={String(data.referrals.summary.total_referrals)} />
            <MetricCard
              label="Converted referrals"
              value={String(data.referrals.summary.converted_referrals)}
            />
            <MetricCard
              label="Stealth referrals"
              value={String(data.referrals.summary.stealth_referrals)}
            />
            <MetricCard label="Referral revenue" value={aud(data.referrals.summary.revenue)} />
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
