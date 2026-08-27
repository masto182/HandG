import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Badge,
  Button,
  Input,
  Label,
  Switch,
  Tabs,
  Table,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { sdk } from "../../lib/sdk"
import { FunnelBar } from "../../components/funnel-bar"

type FunnelStats = {
  dispatched: number
  clicked: number
  click_rate: number
  carted: number
  cart_rate: number
  ordered: number
  order_rate: number
  overall_rate: number
}

type KindBreakdown = {
  kind: string
  dispatched: number
  clicked: number
  carted: number
  ordered: number
  click_rate: number
  order_rate: number
}

type TopItem = { name?: string; title?: string; count: number }

type AlertsInsights = {
  funnel: FunnelStats
  by_kind: KindBreakdown[]
  top_products: TopItem[]
  top_breweries: TopItem[]
  top_hops: TopItem[]
  attributed_revenue: number
}

type ConfigEntry = {
  key: string
  effective: unknown
  source: "db" | "env" | "default"
}

const ALERT_KEYS = [
  "alerts_new_drops_enabled",
  "alerts_max_per_day",
  "alerts_batch_minutes",
  "alerts_quiet_enabled",
  "alerts_quiet_from",
  "alerts_quiet_to",
  "alerts_quiet_tz",
]

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-5">
      <Text size="small" leading="compact" className="text-ui-fg-subtle uppercase tracking-wide">
        {label}
      </Text>
      <p className="text-2xl font-semibold text-ui-fg-base mt-1">{value}</p>
      {sub && (
        <Text size="small" className="text-ui-fg-subtle mt-0.5">
          {sub}
        </Text>
      )}
    </div>
  )
}

function AlertsPage() {
  const [insights, setInsights] = useState<AlertsInsights | null>(null)
  const [loadingInsights, setLoadingInsights] = useState(true)
  const [configMap, setConfigMap] = useState<Record<string, unknown>>({})
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Record<string, unknown>>({})

  useEffect(() => {
    sdk.client
      .fetch<AlertsInsights>("/admin/alerts")
      .then(setInsights)
      .catch(() => {})
      .finally(() => setLoadingInsights(false))

    sdk.client
      .fetch<{ entries: ConfigEntry[] }>("/admin/site-config")
      .then(({ entries }) => {
        const map: Record<string, unknown> = {}
        for (const e of entries) {
          if (ALERT_KEYS.includes(e.key)) map[e.key] = e.effective
        }
        setConfigMap(map)
        setDraft({ ...map })
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false))
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    try {
      await Promise.all(
        ALERT_KEYS.map((key) =>
          sdk.client.fetch(`/admin/site-config/${key}`, {
            method: "POST",
            body: { value: draft[key] },
          })
        )
      )
      setConfigMap({ ...draft })
      toast.success("Alert settings saved")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const f = insights?.funnel

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <Heading level="h1">Alerts</Heading>
        <Badge size="2xsmall" color="grey">
          Last 30 days
        </Badge>
      </div>

      <Tabs defaultValue="insights">
        <Tabs.List>
          <Tabs.Trigger value="insights">Insights</Tabs.Trigger>
          <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="insights" className="pt-6">
          {loadingInsights ? (
            <div className="animate-pulse h-48 bg-ui-bg-subtle rounded-lg" />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Kpi label="Alerts sent" value={f?.dispatched ?? 0} />
                <Kpi label="Click rate" value={`${f?.click_rate ?? 0}%`} />
                <Kpi label="Orders attributed" value={f?.ordered ?? 0} />
                <Kpi
                  label="Attributed revenue"
                  value={`$${((insights?.attributed_revenue ?? 0) / 100).toFixed(0)}`}
                  sub={`${f?.overall_rate ?? 0}% alerts → purchase`}
                />
              </div>

              <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                <Text size="base" weight="plus" className="mb-4">
                  Alert → Sale funnel
                </Text>
                <div className="space-y-3">
                  <FunnelBar
                    label="Alerts sent"
                    count={f?.dispatched ?? 0}
                    total={f?.dispatched ?? 1}
                    rate={100}
                    labelClassName="w-28"
                    rateClassName="w-12"
                  />
                  <FunnelBar
                    label="Clicked"
                    count={f?.clicked ?? 0}
                    total={f?.dispatched ?? 1}
                    rate={f?.click_rate ?? 0}
                    labelClassName="w-28"
                    rateClassName="w-12"
                  />
                  <FunnelBar
                    label="Added to cart"
                    count={f?.carted ?? 0}
                    total={f?.dispatched ?? 1}
                    rate={f?.cart_rate ?? 0}
                    labelClassName="w-28"
                    rateClassName="w-12"
                  />
                  <FunnelBar
                    label="Purchased"
                    count={f?.ordered ?? 0}
                    total={f?.dispatched ?? 1}
                    rate={f?.order_rate ?? 0}
                    labelClassName="w-28"
                    rateClassName="w-12"
                  />
                </div>
                <Text size="small" className="text-ui-fg-subtle mt-3">
                  Overall: {f?.overall_rate ?? 0}% alerts → purchase
                </Text>
              </div>

              {(insights?.by_kind?.length ?? 0) > 0 && (
                <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-ui-border-base">
                    <Text size="base" weight="plus">
                      By alert type
                    </Text>
                  </div>
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell>Alert type</Table.HeaderCell>
                        <Table.HeaderCell>Sent</Table.HeaderCell>
                        <Table.HeaderCell>Clicked</Table.HeaderCell>
                        <Table.HeaderCell>Ordered</Table.HeaderCell>
                        <Table.HeaderCell>Click rate</Table.HeaderCell>
                        <Table.HeaderCell>Order rate</Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {insights!.by_kind.map((k) => (
                        <Table.Row key={k.kind}>
                          <Table.Cell>
                            <Badge
                              size="2xsmall"
                              color={
                                k.kind === "hop" ? "green" : k.kind === "brewery" ? "blue" : "grey"
                              }
                            >
                              {k.kind}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>{k.dispatched}</Table.Cell>
                          <Table.Cell>{k.clicked}</Table.Cell>
                          <Table.Cell>{k.ordered}</Table.Cell>
                          <Table.Cell>{k.click_rate}%</Table.Cell>
                          <Table.Cell>{k.order_rate}%</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(insights?.top_breweries?.length ?? 0) > 0 && (
                  <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-5">
                    <Text size="small" weight="plus" className="mb-3">
                      Top breweries by attributed orders
                    </Text>
                    <div className="space-y-2">
                      {insights!.top_breweries.map((b, i) => (
                        <div key={i} className="flex justify-between">
                          <Text size="small">{b.name}</Text>
                          <Text size="small" className="text-ui-fg-subtle">
                            {b.count} orders
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(insights?.top_hops?.length ?? 0) > 0 && (
                  <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-5">
                    <Text size="small" weight="plus" className="mb-3">
                      Top hops by attributed orders
                    </Text>
                    <div className="space-y-2">
                      {insights!.top_hops.map((h, i) => (
                        <div key={i} className="flex justify-between">
                          <Text size="small">{h.name}</Text>
                          <Text size="small" className="text-ui-fg-subtle">
                            {h.count} orders
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="settings" className="pt-6">
          {loadingConfig ? (
            <div className="animate-pulse h-48 bg-ui-bg-subtle rounded-lg" />
          ) : (
            <div className="space-y-6 max-w-xl">
              <div className="bg-ui-bg-base border border-ui-border-base rounded-lg divide-y divide-ui-border-base">
                <div className="px-6 py-4">
                  <Text size="base" weight="plus">
                    Delivery throttle
                  </Text>
                </div>

                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <Label htmlFor="alerts_enabled">Enable new-drop alerts</Label>
                    <Text size="small" className="text-ui-fg-subtle mt-0.5">
                      Master switch for new-release alert delivery.
                    </Text>
                  </div>
                  <Switch
                    id="alerts_enabled"
                    checked={!!draft.alerts_new_drops_enabled}
                    onCheckedChange={(v) =>
                      setDraft((p) => ({ ...p, alerts_new_drops_enabled: v }))
                    }
                  />
                </div>

                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <Label htmlFor="max_per_day">Max alerts per member per day</Label>
                    <Text size="small" className="text-ui-fg-subtle mt-0.5">
                      Throttle email sends. 0 = unlimited.
                    </Text>
                  </div>
                  <Input
                    id="max_per_day"
                    type="number"
                    min={0}
                    max={50}
                    className="w-20"
                    value={String(draft.alerts_max_per_day ?? 3)}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, alerts_max_per_day: Number(e.target.value) }))
                    }
                  />
                </div>

                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <Label htmlFor="batch_min">Batch window (minutes)</Label>
                    <Text size="small" className="text-ui-fg-subtle mt-0.5">
                      Group multiple drops within this window.
                    </Text>
                  </div>
                  <Input
                    id="batch_min"
                    type="number"
                    min={0}
                    max={1440}
                    className="w-24"
                    value={String(draft.alerts_batch_minutes ?? 30)}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, alerts_batch_minutes: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>

              <div className="bg-ui-bg-base border border-ui-border-base rounded-lg divide-y divide-ui-border-base">
                <div className="px-6 py-4">
                  <Text size="base" weight="plus">
                    Quiet hours
                  </Text>
                </div>

                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <Label htmlFor="quiet_enabled">Pause alerts overnight</Label>
                    <Text size="small" className="text-ui-fg-subtle mt-0.5">
                      Suppress email alerts during quiet hours.
                    </Text>
                  </div>
                  <Switch
                    id="quiet_enabled"
                    checked={!!draft.alerts_quiet_enabled}
                    onCheckedChange={(v) => setDraft((p) => ({ ...p, alerts_quiet_enabled: v }))}
                  />
                </div>

                <div className="px-6 py-4 grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quiet_from" className="mb-1 block">
                      From (hour 0-23)
                    </Label>
                    <Input
                      id="quiet_from"
                      type="number"
                      min={0}
                      max={23}
                      disabled={!draft.alerts_quiet_enabled}
                      value={String(draft.alerts_quiet_from ?? 22)}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, alerts_quiet_from: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiet_to" className="mb-1 block">
                      To (hour 0-23)
                    </Label>
                    <Input
                      id="quiet_to"
                      type="number"
                      min={0}
                      max={23}
                      disabled={!draft.alerts_quiet_enabled}
                      value={String(draft.alerts_quiet_to ?? 8)}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, alerts_quiet_to: Number(e.target.value) }))
                      }
                    />
                  </div>
                </div>

                <div className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <Label htmlFor="quiet_tz">Timezone</Label>
                    <Text size="small" className="text-ui-fg-subtle mt-0.5">
                      IANA timezone (e.g. Australia/Sydney)
                    </Text>
                  </div>
                  <Input
                    id="quiet_tz"
                    className="w-48"
                    disabled={!draft.alerts_quiet_enabled}
                    value={String(draft.alerts_quiet_tz ?? "Australia/Sydney")}
                    onChange={(e) => setDraft((p) => ({ ...p, alerts_quiet_tz: e.target.value }))}
                  />
                </div>
              </div>

              <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                <Text size="base" weight="plus" className="mb-2">
                  Announcement bar
                </Text>
                <Text size="small" className="text-ui-fg-subtle mb-4">
                  Manage the site-wide announcement strip (info, promo, warning types).
                </Text>
                <Link to="/announcements">
                  <Button size="small" variant="secondary">
                    Manage announcements →
                  </Button>
                </Link>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setDraft({ ...configMap })}
                  disabled={saving}
                >
                  Discard
                </Button>
                <Button size="small" isLoading={saving} onClick={saveSettings}>
                  Save changes
                </Button>
              </div>
            </div>
          )}
        </Tabs.Content>
      </Tabs>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Alerts",
})

export default AlertsPage
