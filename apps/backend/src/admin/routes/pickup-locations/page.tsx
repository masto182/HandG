import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Table,
  Switch,
  Textarea,
  Select,
  FocusModal,
  Badge,
  Text,
  toast,
  usePrompt,
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

const DAYS: [string, string][] = [
  ["mon", "Mon"],
  ["tue", "Tue"],
  ["wed", "Wed"],
  ["thu", "Thu"],
  ["fri", "Fri"],
  ["sat", "Sat"],
  ["sun", "Sun"],
]

type DayState = { enabled: boolean; open: string; close: string }
type HoursState = Record<string, DayState>

const blankHours = (): HoursState =>
  Object.fromEntries(DAYS.map(([k]) => [k, { enabled: false, open: "16:00", close: "20:00" }]))

const hoursToState = (hours: Hour[] | null): HoursState => {
  const s = blankHours()
  for (const h of hours || []) {
    const key = (h.day || "").toLowerCase().slice(0, 3)
    if (s[key]) s[key] = { enabled: true, open: h.open || "16:00", close: h.close || "20:00" }
  }
  return s
}

const stateToHours = (s: HoursState): Hour[] =>
  DAYS.filter(([k]) => s[k]?.enabled).map(([k]) => ({
    day: k,
    open: s[k].open,
    close: s[k].close,
  }))

function formatAddress(addr: StockLocationAddress | null): string {
  if (!addr) return "—"
  return [addr.address_1, addr.city, addr.province, addr.postal_code].filter(Boolean).join(", ")
}

const hoursSummary = (hours: Hour[] | null): string => {
  const open = (hours || []).length
  return open ? `${open} day${open === 1 ? "" : "s"}/wk` : "Not set"
}

type FormState = {
  // core stock location
  stock_location_id: string
  name: string
  address_1: string
  address_2: string
  city: string
  province: string
  postal_code: string
  country_code: string
  // pickup extension
  slug: string
  phone: string
  notes: string
  is_active: boolean
  sort_order: number
  hours: HoursState
}

const emptyForm = (): FormState => ({
  stock_location_id: "",
  name: "",
  address_1: "",
  address_2: "",
  city: "",
  province: "",
  postal_code: "",
  country_code: "au",
  slug: "",
  phone: "",
  notes: "",
  is_active: true,
  sort_order: 0,
  hours: blankHours(),
})

const PickupLocationsPage = () => {
  const [locations, setLocations] = useState<PickupLocation[]>([])
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"create" | "edit" | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const prompt = usePrompt()

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))
  const setDay = (key: string, patch: Partial<DayState>) =>
    setForm((f) => ({ ...f, hours: { ...f.hours, [key]: { ...f.hours[key], ...patch } } }))

  const load = async () => {
    setLoading(true)
    try {
      const data = await sdk.client.fetch<{ locations: PickupLocation[] }>(
        "/admin/pickup-locations"
      )
      setLocations(data.locations || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load pickup locations")
    } finally {
      setLoading(false)
    }
  }

  const loadStockLocations = async () => {
    try {
      const data = await sdk.client.fetch<{ stock_locations: StockLocation[] }>(
        "/admin/stock-locations?fields=id,name,*address"
      )
      setStockLocations(data.stock_locations || [])
    } catch {}
  }

  useEffect(() => {
    load()
    loadStockLocations()
  }, [])

  const openCreate = () => {
    setForm(emptyForm())
    setEditingId(null)
    setMode("create")
  }

  const openEdit = (l: PickupLocation) => {
    const a = l.stock_location?.address
    setForm({
      stock_location_id: l.stock_location_id,
      name: l.stock_location?.name || "",
      address_1: a?.address_1 || "",
      address_2: a?.address_2 || "",
      city: a?.city || "",
      province: a?.province || "",
      postal_code: a?.postal_code || "",
      country_code: a?.country_code || "au",
      slug: l.slug || "",
      phone: l.phone || "",
      notes: l.notes || "",
      is_active: l.is_active,
      sort_order: l.sort_order ?? 0,
      hours: hoursToState(l.hours),
    })
    setEditingId(l.id)
    setMode("edit")
  }

  const close = () => {
    setMode(null)
    setEditingId(null)
  }

  const pickupBody = () => ({
    slug: form.slug,
    hours: stateToHours(form.hours),
    phone: form.phone || null,
    notes: form.notes || null,
    is_active: form.is_active,
    sort_order: Number(form.sort_order) || 0,
  })

  const handleSave = async () => {
    if (!form.slug.trim()) {
      toast.error("Slug is required")
      return
    }
    setSaving(true)
    try {
      if (mode === "create") {
        if (!form.stock_location_id) {
          toast.error("Select a stock location")
          setSaving(false)
          return
        }
        await sdk.client.fetch("/admin/pickup-locations", {
          method: "POST",
          body: { stock_location_id: form.stock_location_id, ...pickupBody() },
        })
        toast.success("Pickup location created")
      } else if (editingId) {
        // 1) core stock location name + address
        const stockBody: any = { name: form.name }
        if (form.address_1.trim() && form.country_code.trim()) {
          stockBody.address = {
            country_code: form.country_code.trim().toLowerCase(),
            address_1: form.address_1.trim(),
            address_2: form.address_2 || undefined,
            city: form.city || undefined,
            province: form.province || undefined,
            postal_code: form.postal_code || undefined,
          }
        }
        if (form.stock_location_id) {
          await sdk.admin.stockLocation.update(form.stock_location_id, stockBody)
        }
        // 2) pickup extension fields
        await sdk.client.fetch(`/admin/pickup-locations/${editingId}`, {
          method: "POST",
          body: pickupBody(),
        })
        toast.success("Pickup location updated")
      }
      close()
      load()
    } catch (e: any) {
      toast.error(e?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (l: PickupLocation) => {
    const ok = await prompt({
      title: "Delete pickup location?",
      description: `Removes the pickup config for ${l.stock_location?.name || l.slug}. The core stock location is not deleted.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    })
    if (!ok) return
    try {
      await sdk.client.fetch(`/admin/pickup-locations/${l.id}`, { method: "DELETE" })
      toast.success("Pickup location deleted")
      load()
    } catch (e: any) {
      toast.error(e?.message || "Delete failed")
    }
  }

  const selectedStock = stockLocations.find((s) => s.id === form.stock_location_id)

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Pickup Locations</Heading>
        <Button size="small" onClick={openCreate}>
          Add location
        </Button>
      </div>
      <Text size="small" className="text-ui-fg-subtle px-6 -mt-2 mb-2 block">
        Edit the store name, address, opening hours and storefront details for each pickup point.
      </Text>

      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-muted">Loading…</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Location</Table.HeaderCell>
                <Table.HeaderCell>Address</Table.HeaderCell>
                <Table.HeaderCell>Hours</Table.HeaderCell>
                <Table.HeaderCell>Active</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {locations.map((l) => (
                <Table.Row key={l.id} className="cursor-pointer" onClick={() => openEdit(l)}>
                  <Table.Cell className="font-medium">
                    {l.stock_location?.name || "—"}
                    <span className="text-ui-fg-muted text-xs ml-1">/{l.slug}</span>
                  </Table.Cell>
                  <Table.Cell className="text-sm text-ui-fg-subtle">
                    {formatAddress(l.stock_location?.address || null)}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" color={l.hours?.length ? "blue" : "grey"}>
                      {hoursSummary(l.hours)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    <Switch checked={l.is_active} disabled />
                  </Table.Cell>
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button size="small" variant="secondary" onClick={() => openEdit(l)}>
                        Edit
                      </Button>
                      <Button size="small" variant="danger" onClick={() => handleDelete(l)}>
                        Delete
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
              {locations.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={5}>
                    <div className="text-center text-ui-fg-subtle py-8">
                      No pickup locations yet.
                    </div>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        )}
      </div>

      <FocusModal open={mode !== null} onOpenChange={(o) => !o && close()}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Text weight="plus">
              {mode === "create" ? "Add pickup location" : "Edit pickup location"}
            </Text>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="small" onClick={close} disabled={saving}>
                Cancel
              </Button>
              <Button
                size="small"
                onClick={handleSave}
                isLoading={saving}
                disabled={!form.slug.trim()}
              >
                {mode === "create" ? "Create" : "Save changes"}
              </Button>
            </div>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* LEFT — store identity / address */}
              <div className="space-y-4">
                <Text
                  size="small"
                  weight="plus"
                  className="text-ui-fg-muted uppercase tracking-wide"
                >
                  Store &amp; address
                </Text>

                {mode === "create" ? (
                  <div className="space-y-1">
                    <Label size="small" weight="plus">
                      Stock location
                    </Label>
                    <Select
                      value={form.stock_location_id}
                      onValueChange={(v) => set({ stock_location_id: v })}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="Select a stock location" />
                      </Select.Trigger>
                      <Select.Content>
                        {stockLocations.map((sl) => (
                          <Select.Item key={sl.id} value={sl.id}>
                            {sl.name} — {formatAddress(sl.address)}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                    {selectedStock && (
                      <Text size="small" className="text-ui-fg-muted">
                        Address can be edited after creating.
                      </Text>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label size="small" weight="plus">
                        Store name
                      </Label>
                      <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label size="small" weight="plus">
                        Address line 1
                      </Label>
                      <Input
                        value={form.address_1}
                        onChange={(e) => set({ address_1: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label size="small" weight="plus">
                        Address line 2
                      </Label>
                      <Input
                        value={form.address_2}
                        onChange={(e) => set({ address_2: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label size="small" weight="plus">
                          City
                        </Label>
                        <Input value={form.city} onChange={(e) => set({ city: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label size="small" weight="plus">
                          State / province
                        </Label>
                        <Input
                          value={form.province}
                          onChange={(e) => set({ province: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label size="small" weight="plus">
                          Postcode
                        </Label>
                        <Input
                          value={form.postal_code}
                          onChange={(e) => set({ postal_code: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label size="small" weight="plus">
                          Country code
                        </Label>
                        <Input
                          value={form.country_code}
                          onChange={(e) => set({ country_code: e.target.value })}
                          placeholder="au"
                          maxLength={2}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* RIGHT — pickup details + hours */}
              <div className="space-y-4">
                <Text
                  size="small"
                  weight="plus"
                  className="text-ui-fg-muted uppercase tracking-wide"
                >
                  Pickup details
                </Text>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label size="small" weight="plus">
                      Slug
                    </Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => set({ slug: e.target.value })}
                      disabled={mode === "edit"}
                    />
                    {mode === "edit" && (
                      <Text size="xsmall" className="text-ui-fg-muted">
                        Internal identifier, tied to this location&apos;s shipping option — cannot
                        be changed after creation.
                      </Text>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label size="small" weight="plus">
                      Phone
                    </Label>
                    <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label size="small" weight="plus">
                    Notes
                  </Label>
                  <Textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => set({ notes: e.target.value })}
                    placeholder="e.g. Ring the bell at the side door."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <Label size="small" weight="plus">
                      Sort order
                    </Label>
                    <Input
                      type="number"
                      value={String(form.sort_order)}
                      onChange={(e) => set({ sort_order: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => set({ is_active: v })}
                    />
                    <Label size="small" weight="plus">
                      Active
                    </Label>
                  </div>
                </div>

                <div className="pt-2">
                  <Text
                    size="small"
                    weight="plus"
                    className="text-ui-fg-muted uppercase tracking-wide"
                  >
                    Opening hours
                  </Text>
                  <div className="mt-2 space-y-1.5">
                    {DAYS.map(([key, label]) => {
                      const d = form.hours[key]
                      return (
                        <div key={key} className="flex items-center gap-3 h-9">
                          <Switch
                            checked={d.enabled}
                            onCheckedChange={(v) => setDay(key, { enabled: v })}
                          />
                          <span className="w-10 text-sm">{label}</span>
                          {d.enabled ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={d.open}
                                onChange={(e) => setDay(key, { open: e.target.value })}
                                className="w-28"
                              />
                              <span className="text-ui-fg-muted text-sm">–</span>
                              <Input
                                type="time"
                                value={d.close}
                                onChange={(e) => setDay(key, { close: e.target.value })}
                                className="w-28"
                              />
                            </div>
                          ) : (
                            <Text size="small" className="text-ui-fg-muted">
                              Closed
                            </Text>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Pickup Locations",
})

export default PickupLocationsPage
