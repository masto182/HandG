import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Table,
  Drawer,
  Switch,
  Textarea,
  Select,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type Hour = { day: string; open: string; close: string }

type StockLocationAddress = {
  address_1: string | null
  address_2: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  country_code: string | null
}

type StockLocation = {
  id: string
  name: string
  address: StockLocationAddress | null
}

type PickupLocation = {
  id: string
  stock_location_id: string
  slug: string
  hours: Hour[] | null
  phone: string | null
  notes: string | null
  is_active: boolean
  sort_order: number
  stock_location: StockLocation | null
}

type EditPayload = {
  slug?: string
  hours?: Hour[]
  phone?: string | null
  notes?: string | null
  is_active?: boolean
  sort_order?: number
}

type CreatePayload = EditPayload & {
  stock_location_id: string
}

const blankCreate: CreatePayload = {
  stock_location_id: "",
  slug: "",
  hours: [],
  phone: "",
  notes: "",
  is_active: true,
  sort_order: 0,
}

function formatAddress(addr: StockLocationAddress | null): string {
  if (!addr) return "—"
  return [addr.address_1, addr.city, addr.province, addr.postal_code]
    .filter(Boolean)
    .join(", ")
}

function PickupForm({
  initial,
  stockLocations,
  isCreate,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: CreatePayload & { stock_location?: StockLocation | null }
  stockLocations: StockLocation[]
  isCreate: boolean
  onSave: (payload: CreatePayload) => Promise<void>
  onCancel: () => void
  saving: boolean
  error: string | null
}) {
  const [draft, setDraft] = useState<CreatePayload>({
    stock_location_id: initial.stock_location_id || "",
    slug: initial.slug || "",
    hours: initial.hours || [],
    phone: initial.phone || "",
    notes: initial.notes || "",
    is_active: initial.is_active ?? true,
    sort_order: initial.sort_order ?? 0,
  })
  const [hoursText, setHoursText] = useState<string>(
    JSON.stringify(initial.hours || [], null, 2)
  )

  const setField = (k: keyof CreatePayload, v: any) =>
    setDraft((prev) => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    let hours: Hour[] = []
    try {
      hours = JSON.parse(hoursText) as Hour[]
    } catch {
      alert("Hours must be valid JSON, e.g. [{\"day\":\"thu\",\"open\":\"16:00\",\"close\":\"20:00\"}]")
      return
    }
    await onSave({ ...draft, hours })
  }

  const selectedStockLoc = stockLocations.find((s) => s.id === draft.stock_location_id)

  return (
    <Drawer.Body className="space-y-3 overflow-y-auto">
      {isCreate ? (
        <div>
          <Label>Stock Location (core)</Label>
          <Select
            value={draft.stock_location_id}
            onValueChange={(v) => setField("stock_location_id", v)}
          >
            <Select.Trigger>
              <Select.Value placeholder="Select a pickup stock location" />
            </Select.Trigger>
            <Select.Content>
              {stockLocations.map((sl) => (
                <Select.Item key={sl.id} value={sl.id}>
                  {sl.name} — {formatAddress(sl.address)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      ) : (
        <div>
          <Label>Location (read-only from core)</Label>
          <p className="text-sm text-ui-fg-subtle mt-1">
            <strong>{initial.stock_location?.name || "Unknown"}</strong>
            <br />
            {formatAddress(initial.stock_location?.address || null)}
          </p>
          <p className="text-xs text-ui-fg-muted mt-1">
            Edit address via Settings → Locations
          </p>
        </div>
      )}
      <div>
        <Label>Slug</Label>
        <Input
          value={draft.slug || ""}
          onChange={(e) => setField("slug", e.target.value)}
        />
      </div>
      <div>
        <Label>Phone</Label>
        <Input
          value={draft.phone || ""}
          onChange={(e) => setField("phone", e.target.value)}
        />
      </div>
      <div>
        <Label>Notes</Label>
        <Input
          value={draft.notes || ""}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </div>
      <div>
        <Label>Hours (JSON)</Label>
        <Textarea
          rows={4}
          value={hoursText}
          onChange={(e) => setHoursText(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Sort order</Label>
          <Input
            type="number"
            value={String(draft.sort_order ?? 0)}
            onChange={(e) => setField("sort_order", Number(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch
            checked={Boolean(draft.is_active)}
            onCheckedChange={(v) => setField("is_active", v)}
          />
          <Label>Active</Label>
        </div>
      </div>
      {error && <p className="text-ui-fg-error text-sm">{error}</p>}
      <div className="flex justify-end gap-2 pt-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button isLoading={saving} onClick={handleSave}>
          Save
        </Button>
      </div>
    </Drawer.Body>
  )
}

const PickupLocationsPage = () => {
  const [locations, setLocations] = useState<PickupLocation[]>([])
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<PickupLocation | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await sdk.client.fetch<{ locations: PickupLocation[] }>(
        "/admin/pickup-locations"
      )
      setLocations(data.locations || [])
    } finally {
      setLoading(false)
    }
  }

  const loadStockLocations = async () => {
    try {
      const data = await sdk.client.fetch<{ stock_locations: StockLocation[] }>(
        "/admin/stock-locations"
      )
      setStockLocations(data.stock_locations || [])
    } catch {}
  }

  useEffect(() => {
    load()
    loadStockLocations()
  }, [])

  const handleCreate = async (payload: CreatePayload) => {
    setError(null)
    setSaving(true)
    try {
      await sdk.client.fetch("/admin/pickup-locations", {
        method: "POST",
        body: payload,
      })
      setShowCreate(false)
      load()
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (payload: CreatePayload) => {
    if (!editing) return
    setError(null)
    setSaving(true)
    try {
      const { stock_location_id, ...editFields } = payload
      await sdk.client.fetch(`/admin/pickup-locations/${editing.id}`, {
        method: "POST",
        body: editFields,
      })
      setEditing(null)
      load()
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await sdk.client.fetch(`/admin/pickup-locations/${id}`, {
        method: "DELETE",
      })
      setConfirmDeleteId(null)
      load()
    } catch (e: any) {
      alert(`Delete failed: ${e?.message || String(e)}`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Container>
      <div className="flex justify-between items-center mb-2">
        <Heading level="h1">Pickup Locations</Heading>
        <Button onClick={() => setShowCreate(true)}>Add Location</Button>
      </div>
      <p className="text-ui-fg-subtle mb-4 text-sm">
        Extension metadata for pickup stock locations. Name and address are
        managed via Settings → Locations. This page adds hours, notes, phone,
        and active/sort controls for the storefront.
      </p>

      {loading ? (
        <p className="text-ui-fg-muted">Loading…</p>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Location</Table.HeaderCell>
              <Table.HeaderCell>Address</Table.HeaderCell>
              <Table.HeaderCell>Slug</Table.HeaderCell>
              <Table.HeaderCell>Active</Table.HeaderCell>
              <Table.HeaderCell>Sort</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {locations.map((l) => (
              <Table.Row key={l.id}>
                <Table.Cell>
                  <p className="font-medium">{l.stock_location?.name || "—"}</p>
                </Table.Cell>
                <Table.Cell className="text-sm">
                  {formatAddress(l.stock_location?.address || null)}
                </Table.Cell>
                <Table.Cell className="text-xs text-ui-fg-muted">{l.slug}</Table.Cell>
                <Table.Cell>{l.is_active ? "Yes" : "No"}</Table.Cell>
                <Table.Cell>{l.sort_order}</Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <Button size="small" variant="secondary" onClick={() => setEditing(l)}>
                      Edit
                    </Button>
                    {confirmDeleteId === l.id ? (
                      <>
                        <Button
                          size="small"
                          variant="danger"
                          isLoading={deleting}
                          onClick={() => handleDelete(l.id)}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => setConfirmDeleteId(l.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      <Drawer open={showCreate} onOpenChange={(o) => { if (!o) setShowCreate(false) }}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Add Pickup Location</Drawer.Title>
          </Drawer.Header>
          <PickupForm
            initial={blankCreate}
            stockLocations={stockLocations}
            isCreate={true}
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
            saving={saving}
            error={error}
          />
        </Drawer.Content>
      </Drawer>

      <Drawer open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit Pickup Location</Drawer.Title>
          </Drawer.Header>
          {editing && (
            <PickupForm
              initial={{
                stock_location_id: editing.stock_location_id,
                slug: editing.slug,
                hours: editing.hours,
                phone: editing.phone,
                notes: editing.notes,
                is_active: editing.is_active,
                sort_order: editing.sort_order,
                stock_location: editing.stock_location,
              }}
              stockLocations={stockLocations}
              isCreate={false}
              onSave={handleUpdate}
              onCancel={() => setEditing(null)}
              saving={saving}
              error={error}
            />
          )}
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Pickup Locations",
})

export default PickupLocationsPage
