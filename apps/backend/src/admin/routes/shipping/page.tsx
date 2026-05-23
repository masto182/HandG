import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Input, Label, Switch, Badge, Table, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type ConfigEntry = {
  key: string
  group: string
  label: string
  type: "string" | "number" | "boolean" | "json"
  effective: unknown
  source: "override" | "env" | "default"
}

type Carrier = {
  carrier_id: string
  carrier_code: string
  friendly_name: string
  services: { service_code: string; name: string }[]
}

type HeldOrder = {
  id: string
  display_id?: string | number
  created_at: string
  total: number
  shipping_address: { city?: string; state?: string; postcode?: string } | null
}

const FROM_ADDRESS_KEYS = [
  "shipping_from_name",
  "shipping_from_phone",
  "shipping_from_address_1",
  "shipping_from_city",
  "shipping_from_state",
  "shipping_from_postcode",
  "shipping_from_country",
] as const

const TOGGLE_KEYS = ["heat_hold_enabled", "auto_pick_cheapest_label"] as const

const ShippingPage = () => {
  const [config, setConfig] = useState<Record<string, ConfigEntry>>({})
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [carriersLoading, setCarriersLoading] = useState(false)
  const [carriersError, setCarriersError] = useState<string | null>(null)
  const [mode, setMode] = useState<"live" | "stub">("stub")
  const [activeCarrierIds, setActiveCarrierIds] = useState<string[]>([])
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([])
  const [heldEnabled, setHeldEnabled] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = async () => {
    const res = await sdk.client.fetch<{ entries: ConfigEntry[] }>("/admin/site-config", {
      method: "GET",
    })
    const map: Record<string, ConfigEntry> = {}
    for (const e of res.entries) map[e.key] = e
    setConfig(map)
    const d: Record<string, string> = {}
    for (const k of FROM_ADDRESS_KEYS) {
      d[k] = map[k]?.effective ? String(map[k].effective) : ""
    }
    setDraft(d)
    const carrierIds = (map.shipengine_carrier_ids?.effective as string[] | undefined) ?? []
    setActiveCarrierIds(carrierIds)
  }

  const refreshCarriers = async () => {
    setCarriersLoading(true)
    setCarriersError(null)
    try {
      const res = await sdk.client.fetch<{ mode: "live" | "stub"; carriers: Carrier[] }>(
        "/admin/shipping/refresh-carriers",
        { method: "POST" },
      )
      setMode(res.mode)
      setCarriers(res.carriers)
    } catch (e) {
      setCarriersError((e as Error).message)
    } finally {
      setCarriersLoading(false)
    }
  }

  const loadHeld = async () => {
    try {
      const res = await sdk.client.fetch<{ heat_hold_enabled: boolean; orders: HeldOrder[] }>(
        "/admin/orders/heat-held",
        { method: "GET" },
      )
      setHeldEnabled(res.heat_hold_enabled)
      setHeldOrders(res.orders)
    } catch {
      setHeldOrders([])
    }
  }

  useEffect(() => {
    void loadConfig()
    void refreshCarriers()
    void loadHeld()
  }, [])

  const patch = async (key: string, value: unknown) => {
    setSavingKey(key)
    setError(null)
    try {
      await sdk.client.fetch(`/admin/site-config/${encodeURIComponent(key)}`, {
        method: "PATCH",
        body: { value },
      })
      await loadConfig()
      if (key === "heat_hold_enabled") await loadHeld()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSavingKey(null)
    }
  }

  const toggleCarrier = async (id: string) => {
    const next = activeCarrierIds.includes(id)
      ? activeCarrierIds.filter((x) => x !== id)
      : [...activeCarrierIds, id]
    setActiveCarrierIds(next)
    await patch("shipengine_carrier_ids", next)
  }

  return (
    <Container className="p-6 space-y-6">
      <Heading level="h1">Shipping</Heading>
      <Text className="text-ui-fg-subtle">
        ShipEngine integration ({mode === "live" ? <Badge>live</Badge> : <Badge color="orange">stub</Badge>}).
        See <code>apps/backend/src/modules/shipengine/README.md</code> for cost model + AU carrier guidance.
      </Text>

      {error ? (
        <Container className="border-red-500 border p-3 bg-red-50">
          <Text className="text-red-700">{error}</Text>
        </Container>
      ) : null}

      {/* ---------- Heat hold + auto-pick toggles ---------- */}
      <Container className="border p-4 space-y-4">
        <Heading level="h2">Operational toggles</Heading>
        {TOGGLE_KEYS.map((k) => {
          const entry = config[k]
          if (!entry) return null
          const checked = Boolean(entry.effective)
          return (
            <div key={k} className="flex items-center justify-between">
              <div>
                <Label>{entry.label}</Label>
                <Text className="text-ui-fg-subtle text-xs">
                  {k === "heat_hold_enabled"
                    ? "When ON, all shipments are blocked. Customers see a banner; admins must override per-order."
                    : "When ON, fulfillment uses cheapest live rate at ship time, regardless of customer choice. Customer choice is logged."}
                </Text>
              </div>
              <Switch
                checked={checked}
                disabled={savingKey === k}
                onCheckedChange={(v) => patch(k, v)}
              />
            </div>
          )
        })}
        {heldEnabled && heldOrders.length > 0 ? (
          <Container className="bg-yellow-50 border border-yellow-300 p-3 rounded">
            <Text>
              <strong>{heldOrders.length}</strong> order(s) currently held by heat hold. Toggle off OR mark
              ready-to-ship with override per order.
            </Text>
          </Container>
        ) : null}
      </Container>

      {/* ---------- Ship-from address ---------- */}
      <Container className="border p-4 space-y-4">
        <Heading level="h2">Ship-from address</Heading>
        <Text className="text-ui-fg-subtle text-xs">
          Used for every label. Match the address registered with your AusPost MyPost Business pickup.
        </Text>
        <div className="grid grid-cols-2 gap-3">
          {FROM_ADDRESS_KEYS.map((k) => {
            const entry = config[k]
            if (!entry) return null
            return (
              <div key={k}>
                <Label>{entry.label}</Label>
                <Input
                  value={draft[k] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                  onBlur={() => {
                    if (draft[k] !== String(entry.effective ?? "")) {
                      void patch(k, draft[k])
                    }
                  }}
                  disabled={savingKey === k}
                />
                {entry.source !== "default" ? <Badge>{entry.source}</Badge> : null}
              </div>
            )
          })}
        </div>
      </Container>

      {/* ---------- Carriers panel ---------- */}
      <Container className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Heading level="h2">Carriers</Heading>
          <Button onClick={() => void refreshCarriers()} disabled={carriersLoading} variant="secondary">
            {carriersLoading ? "Refreshing..." : "Refresh from ShipEngine"}
          </Button>
        </div>
        {carriersError ? <Text className="text-red-600">{carriersError}</Text> : null}
        {carriers.length === 0 && !carriersLoading ? (
          <Container className="bg-ui-bg-subtle p-4 rounded">
            <Text>
              No carriers connected. Visit{" "}
              <a
                href="https://dashboard.shipengine.com/carriers"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                ShipEngine Carriers
              </a>
              :
            </Text>
            <ol className="list-decimal pl-6 text-ui-fg-subtle text-sm mt-2 space-y-1">
              <li>Enable <strong>CouriersPlease</strong> + <strong>Aramex Australia</strong> from the "ShipStation Carriers" list (cheaper rates, no contract).</li>
              <li>Connect <strong>Australia Post MyPost Business</strong> (your own credentials).</li>
              <li>Refresh this panel and tick the carriers you want to use.</li>
            </ol>
          </Container>
        ) : null}
        {carriers.length > 0 ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Active</Table.HeaderCell>
                <Table.HeaderCell>Carrier</Table.HeaderCell>
                <Table.HeaderCell>Code</Table.HeaderCell>
                <Table.HeaderCell>Services</Table.HeaderCell>
                <Table.HeaderCell>ID</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {carriers.map((c) => (
                <Table.Row key={c.carrier_id}>
                  <Table.Cell>
                    <Switch
                      checked={activeCarrierIds.includes(c.carrier_id)}
                      onCheckedChange={() => void toggleCarrier(c.carrier_id)}
                    />
                  </Table.Cell>
                  <Table.Cell>{c.friendly_name}</Table.Cell>
                  <Table.Cell><code>{c.carrier_code}</code></Table.Cell>
                  <Table.Cell className="text-xs">
                    {c.services.slice(0, 4).map((s) => s.service_code).join(", ")}
                    {c.services.length > 4 ? ` (+${c.services.length - 4})` : ""}
                  </Table.Cell>
                  <Table.Cell className="text-xs"><code>{c.carrier_id}</code></Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : null}
      </Container>

      {/* ---------- Rate comparison snapshot ---------- */}
      <RateComparisonSnapshot />
    </Container>
  )
}

const RateComparisonSnapshot = () => {
  const [rows, setRows] = useState<Array<{
    sampled_at: string
    label: string
    cheapest_carrier_code: string
    cheapest_amount_cents: number
    carrier_results: Array<{ carrier_code: string; amount_cents: number }>
  }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    sdk.client
      .fetch<{ rows: typeof rows }>("/admin/shipping/rate-comparison", { method: "GET" })
      .then((res) => setRows(res.rows ?? []))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container className="border p-4 space-y-4">
      <Heading level="h2">Rate comparison (last sample)</Heading>
      <Text className="text-ui-fg-subtle text-xs">
        Weekly cron quotes 4 sample shipments across configured carriers. Used to spot pricing trends and
        validate the carrier mix.
      </Text>
      {loading ? <Text>Loading…</Text> : null}
      {error ? <Text className="text-red-600">{error}</Text> : null}
      {!loading && rows.length === 0 ? (
        <Text className="text-ui-fg-subtle">No samples yet. The cron runs weekly; first run will populate this card.</Text>
      ) : null}
      {rows.length > 0 ? (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Sample</Table.HeaderCell>
              <Table.HeaderCell>Cheapest</Table.HeaderCell>
              <Table.HeaderCell>Amount</Table.HeaderCell>
              <Table.HeaderCell>All carriers</Table.HeaderCell>
              <Table.HeaderCell>Sampled</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((r, i) => (
              <Table.Row key={i}>
                <Table.Cell>{r.label}</Table.Cell>
                <Table.Cell><code>{r.cheapest_carrier_code}</code></Table.Cell>
                <Table.Cell>${(r.cheapest_amount_cents / 100).toFixed(2)}</Table.Cell>
                <Table.Cell className="text-xs">
                  {r.carrier_results
                    .map((c) => `${c.carrier_code}=$${(c.amount_cents / 100).toFixed(2)}`)
                    .join(", ")}
                </Table.Cell>
                <Table.Cell className="text-xs">{new Date(r.sampled_at).toLocaleString()}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      ) : null}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Shipping",
})

export default ShippingPage
