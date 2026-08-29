import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Table, Text, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type EligibleFulfillment = {
  id: string
  carrier_id: string | null
  carrier_code: string | null
  tracking_number: string | null
}

type ScheduledPickup = {
  id: string
  pickup: {
    pickup_id: string
    status: string
    pickup_window: { start_at: string; end_at: string }
    confirmation_numbers?: string[]
    scheduled_at: string
  }
}

const PickupsPage = () => {
  const [eligible, setEligible] = useState<EligibleFulfillment[]>([])
  const [scheduled, setScheduled] = useState<ScheduledPickup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [scheduling, setScheduling] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await sdk.client.fetch<{
        eligible: EligibleFulfillment[]
        scheduled: ScheduledPickup[]
      }>("/admin/pickups", { method: "GET" })
      setEligible(res.eligible ?? [])
      setScheduled(res.scheduled ?? [])
      setSelected(new Set())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const schedulePickup = async () => {
    if (!selected.size) return
    setScheduling(true)
    setError(null)
    try {
      await sdk.client.fetch("/admin/pickups", {
        method: "POST",
        body: { fulfillment_ids: Array.from(selected) },
      })
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setScheduling(false)
    }
  }

  const cancel = async (pickupId: string) => {
    setCancelling(pickupId)
    setError(null)
    try {
      await sdk.client.fetch(`/admin/pickups/${encodeURIComponent(pickupId)}`, { method: "DELETE" })
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCancelling(null)
    }
  }

  return (
    <Container className="p-6 space-y-6">
      <Heading level="h1">Carrier Pickups</Heading>
      <Text className="text-ui-fg-subtle text-xs">
        Schedule and track ShipEngine carrier pickups for labelled fulfillments. Fulfillments in a
        single pickup must share the same carrier.
      </Text>

      {error ? (
        <Container className="border-red-500 border p-3 bg-red-50">
          <Text className="text-red-700">{error}</Text>
        </Container>
      ) : null}

      <Container className="border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Heading level="h2">Awaiting pickup</Heading>
          <Button size="small" disabled={!selected.size || scheduling} onClick={schedulePickup}>
            {scheduling ? "Scheduling..." : `Schedule Pickup (${selected.size})`}
          </Button>
        </div>
        {loading ? <Text>Loading...</Text> : null}
        {!loading && eligible.length === 0 ? (
          <Text className="text-ui-fg-subtle">No fulfillments currently awaiting pickup.</Text>
        ) : null}
        {eligible.length > 0 ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell />
                <Table.HeaderCell>Fulfillment</Table.HeaderCell>
                <Table.HeaderCell>Carrier</Table.HeaderCell>
                <Table.HeaderCell>Tracking #</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {eligible.map((f) => (
                <Table.Row key={f.id} className="cursor-pointer" onClick={() => toggle(f.id)}>
                  <Table.Cell>
                    <input
                      type="checkbox"
                      checked={selected.has(f.id)}
                      onChange={() => toggle(f.id)}
                    />
                  </Table.Cell>
                  <Table.Cell className="text-xs">{f.id}</Table.Cell>
                  <Table.Cell className="text-xs">
                    {f.carrier_code ?? f.carrier_id ?? "—"}
                  </Table.Cell>
                  <Table.Cell className="text-xs">{f.tracking_number ?? "—"}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : null}
      </Container>

      <Container className="border p-4 space-y-4">
        <Heading level="h2">Scheduled pickups</Heading>
        {!loading && scheduled.length === 0 ? (
          <Text className="text-ui-fg-subtle">No pickups scheduled yet.</Text>
        ) : null}
        {scheduled.length > 0 ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Fulfillment</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Window</Table.HeaderCell>
                <Table.HeaderCell>Confirmation</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {scheduled.map((s) => (
                <Table.Row key={s.id}>
                  <Table.Cell className="text-xs">{s.id}</Table.Cell>
                  <Table.Cell>
                    <Badge>{s.pickup.status}</Badge>
                  </Table.Cell>
                  <Table.Cell className="text-xs">
                    {new Date(s.pickup.pickup_window.start_at).toLocaleString()} –{" "}
                    {new Date(s.pickup.pickup_window.end_at).toLocaleTimeString()}
                  </Table.Cell>
                  <Table.Cell className="text-xs">
                    {(s.pickup.confirmation_numbers ?? []).join(", ") || "—"}
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      size="small"
                      variant="danger"
                      disabled={cancelling === s.pickup.pickup_id}
                      onClick={() => cancel(s.pickup.pickup_id)}
                    >
                      {cancelling === s.pickup.pickup_id ? "Cancelling..." : "Cancel"}
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : null}
      </Container>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Pickups",
})

export default PickupsPage
