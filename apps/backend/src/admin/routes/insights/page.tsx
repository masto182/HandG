import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"

type InsightsData = {
  members: {
    total: number
    pending: number
    approved: number
    applications_submitted: number
  }
  tiers: Record<string, number>
  abandoned_carts: number
  wishlist: {
    top_products: Array<{ product_id: string; count: number }>
    pending_offers: number
    approved_offers: number
  }
}

const Card = ({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string | number
  subtitle?: string
}) => (
  <div className="rounded-lg border border-ui-border-base p-4 flex flex-col gap-1">
    <span className="text-xs text-ui-fg-subtle uppercase tracking-wider">
      {title}
    </span>
    <span className="text-2xl font-bold">{value}</span>
    {subtitle && (
      <span className="text-xs text-ui-fg-muted">{subtitle}</span>
    )}
  </div>
)

const InsightsPage = () => {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/admin/insights", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <Container><p>Loading insights...</p></Container>
  if (!data) return <Container><p>Failed to load insights.</p></Container>

  const conversionRate =
    data.members.applications_submitted > 0
      ? ((data.members.approved / data.members.applications_submitted) * 100).toFixed(
          1
        )
      : "0"

  return (
    <Container className="p-8">
      <Heading level="h1" className="mb-6">Insights</Heading>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card title="Total Members" value={data.members.total} />
        <Card
          title="Pending Applications"
          value={data.members.pending}
          subtitle={`${data.members.applications_submitted} total submitted`}
        />
        <Card
          title="Conversion Rate"
          value={`${conversionRate}%`}
          subtitle="Applications → Approved"
        />
        <Card
          title="Abandoned Carts"
          value={data.abandoned_carts}
          subtitle="Inactive 24h+ with items"
        />
      </div>

      <Heading level="h2" className="mb-4">VIP Tier Distribution</Heading>
      <div className="flex gap-3 flex-wrap mb-8">
        {Object.entries(data.tiers)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([tier, count]) => (
            <div key={tier} className="flex items-center gap-2">
              <Badge color={tier.startsWith("vip") ? "green" : "grey"}>
                {tier}
              </Badge>
              <span className="text-sm font-medium">{count}</span>
            </div>
          ))}
      </div>

      <Heading level="h2" className="mb-4">Buy-at-Price Offers</Heading>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card title="Pending Offers" value={data.wishlist.pending_offers} />
        <Card title="Approved Offers" value={data.wishlist.approved_offers} />
        <Card
          title="Total Active"
          value={data.wishlist.pending_offers + data.wishlist.approved_offers}
        />
      </div>

      {data.wishlist.top_products.length > 0 && (
        <>
          <Heading level="h2" className="mb-4">Top Wishlisted Products</Heading>
          <div className="space-y-2">
            {data.wishlist.top_products.map((p, i) => (
              <div
                key={p.product_id}
                className="flex items-center justify-between border-b border-ui-border-base pb-2"
              >
                <span className="text-sm">
                  #{i + 1} · {p.product_id.slice(-12)}
                </span>
                <Badge color="blue">{p.count} wishlist{p.count > 1 ? "s" : ""}</Badge>
              </div>
            ))}
          </div>
        </>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Insights",
  icon: undefined,
})

export default InsightsPage
