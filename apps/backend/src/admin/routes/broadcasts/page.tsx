import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Table,
  Button,
  Input,
  Label,
  Textarea,
  FocusModal,
  Badge,
  Text,
  Select,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type Broadcast = {
  id: string
  title: string
  body: string
  link_text: string | null
  link_url: string | null
  segment_filter: SegmentFilter
  channel_inapp: boolean
  channel_email: boolean
  create_banner: boolean
  banner_id: string | null
  status: "draft" | "sending" | "sent" | "failed"
  recipient_count: number
  sent_count: number
  failed_count: number
  sent_at: string | null
  created_at: string
}

type SegmentFilter = {
  mode?: "filters" | "customers"
  customer_ids?: string[]
  vip_tier_min?: string
  category_optin?: string
  brewery_id?: string
  hop_id?: string
  has_ordered?: boolean
  account_status?: string
}

type Option = { id: string; name: string }

type PickedCustomer = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
}

type FormState = {
  title: string
  body: string
  link_text: string
  link_url: string
  targeting_mode: "filters" | "customers"
  selectedCustomers: PickedCustomer[]
  vip_tier_min: string
  category_optin: string
  brewery_id: string
  hop_id: string
  has_ordered: boolean
  account_status: string
  channel_inapp: boolean
  channel_email: boolean
  create_banner: boolean
}

const EMPTY_FORM: FormState = {
  title: "",
  body: "",
  link_text: "",
  link_url: "",
  targeting_mode: "filters",
  selectedCustomers: [],
  vip_tier_min: "",
  category_optin: "",
  brewery_id: "",
  hop_id: "",
  has_ordered: false,
  account_status: "",
  channel_inapp: true,
  channel_email: true,
  create_banner: false,
}

const VIP_TIERS = ["approved", "vip1", "vip2", "vip3", "vip4", "vip5"]
const CATEGORIES = [
  "restock_alerts",
  "vip_progression",
  "referrals",
  "wishlist_offers",
  "brewery_releases",
  "new_drops",
  "hop_alerts",
  "announcements",
]
const ACCOUNT_STATUSES = ["pending", "approved", "rejected", "suspended", "active"]

// Radix Select.Item disallows an empty-string value, so "no filter" needs a
// sentinel we translate back to "" when read.
const ANY_VALUE = "__any__"
const toSelectValue = (v: string) => v || ANY_VALUE
const fromSelectValue = (v: string) => (v === ANY_VALUE ? "" : v)

function customerLabel(c: PickedCustomer) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ")
  return name ? `${name} (${c.email})` : c.email
}

function statusBadge(status: Broadcast["status"]) {
  if (status === "sent") return <Badge color="green">Sent</Badge>
  if (status === "sending") return <Badge color="orange">Sending</Badge>
  if (status === "failed") return <Badge color="red">Failed</Badge>
  return <Badge color="grey">Draft</Badge>
}

function formToSegmentFilter(form: FormState): SegmentFilter {
  if (form.targeting_mode === "customers") {
    return { mode: "customers", customer_ids: form.selectedCustomers.map((c) => c.id) }
  }
  const filter: SegmentFilter = {}
  if (form.vip_tier_min) filter.vip_tier_min = form.vip_tier_min
  if (form.category_optin) filter.category_optin = form.category_optin
  if (form.brewery_id) filter.brewery_id = form.brewery_id
  if (form.hop_id) filter.hop_id = form.hop_id
  if (form.has_ordered) filter.has_ordered = true
  if (form.account_status) filter.account_status = form.account_status
  return filter
}

function formFromBroadcast(b: Broadcast): FormState {
  const f = b.segment_filter ?? {}
  const isCustomerMode = f.mode === "customers"
  return {
    title: b.title,
    body: b.body,
    link_text: b.link_text ?? "",
    link_url: b.link_url ?? "",
    targeting_mode: isCustomerMode ? "customers" : "filters",
    // Picked customers' email/name aren't stored on the broadcast — the
    // picker just won't show chips for a re-opened draft's prior picks
    // (ids are preserved on submit unless the admin changes the selection).
    selectedCustomers: [],
    vip_tier_min: f.vip_tier_min ?? "",
    category_optin: f.category_optin ?? "",
    brewery_id: f.brewery_id ?? "",
    hop_id: f.hop_id ?? "",
    has_ordered: Boolean(f.has_ordered),
    account_status: f.account_status ?? "",
    channel_inapp: b.channel_inapp !== false,
    channel_email: b.channel_email !== false,
    create_banner: Boolean(b.create_banner),
  }
}

function CustomerPicker({
  selected,
  setSelected,
}: {
  selected: PickedCustomer[]
  setSelected: (c: PickedCustomer[]) => void
}) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<PickedCustomer[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      setSearching(true)
      sdk.admin.customer
        .list({ q, limit: 8, fields: "id,email,first_name,last_name" } as any)
        .then((r: any) => setResults(r.customers || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const addCustomer = (c: PickedCustomer) => {
    if (!selected.find((x) => x.id === c.id)) setSelected([...selected, c])
  }
  const removeCustomer = (id: string) => setSelected(selected.filter((x) => x.id !== id))

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1.5 bg-ui-bg-subtle border border-ui-border-base rounded-md pl-2 pr-2 py-1 text-sm"
            >
              {customerLabel(c)}
              <button
                type="button"
                onClick={() => removeCustomer(c.id)}
                className="text-ui-fg-muted hover:text-ui-fg-base"
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        placeholder="Search customers by name or email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {(searching || results.length > 0) && (
        <div className="border border-ui-border-base rounded-md max-h-48 overflow-y-auto divide-y divide-ui-border-base">
          {searching && (
            <Text size="small" className="text-ui-fg-muted p-2">
              Searching…
            </Text>
          )}
          {results.map((c) => {
            const added = !!selected.find((x) => x.id === c.id)
            return (
              <button
                key={c.id}
                type="button"
                disabled={added}
                onClick={() => addCustomer(c)}
                className="flex items-center gap-2 w-full text-left p-2 hover:bg-ui-bg-subtle disabled:opacity-50"
              >
                <span className="text-sm flex-1">{customerLabel(c)}</span>
                {added && (
                  <Badge size="2xsmall" color="green">
                    added
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      )}
      <Text size="small" className="text-ui-fg-muted">
        {selected.length} customer{selected.length === 1 ? "" : "s"} selected
      </Text>
    </div>
  )
}

function ComposerForm({
  initial,
  breweries,
  hops,
  onSend,
  onSaveDraft,
  onCancel,
  saving,
}: {
  initial: FormState
  breweries: Option[]
  hops: Option[]
  onSend: (f: FormState) => void
  onSaveDraft: (f: FormState) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const prompt = usePrompt()
  const set = (field: keyof FormState, value: any) => {
    setForm((f) => ({ ...f, [field]: value }))
    setPreviewCount(null)
  }

  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const res = await sdk.client.fetch<{ count: number }>("/admin/broadcasts/preview", {
        method: "POST",
        body: { segment_filter: formToSegmentFilter(form) },
      })
      setPreviewCount(res.count)
    } catch {
      toast.error("Failed to preview recipients")
    } finally {
      setPreviewing(false)
    }
  }

  const handleSend = async () => {
    const confirmed = await prompt({
      title: "Send broadcast",
      description: `This will notify ${
        previewCount ?? "an unknown number of"
      } customers. This cannot be undone. Continue?`,
      confirmText: "Send",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    onSend(form)
  }

  const hasContent = form.title.trim() && form.body.trim()
  const hasChannel = form.channel_inapp || form.channel_email
  const hasRecipientsPicked = form.targeting_mode === "filters" || form.selectedCustomers.length > 0
  const valid = hasContent && hasChannel && hasRecipientsPicked

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <Label htmlFor="title" className="mb-1 block">
          Title *
        </Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="New feature: Wishlist offers"
        />
      </div>
      <div>
        <Label htmlFor="body" className="mb-1 block">
          Message *
        </Label>
        <Textarea
          id="body"
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          placeholder="We've added the ability to make offers on wishlist items..."
          rows={4}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="link_text" className="mb-1 block">
            Link label (optional)
          </Label>
          <Input
            id="link_text"
            value={form.link_text}
            onChange={(e) => set("link_text", e.target.value)}
            placeholder="Learn more"
          />
        </div>
        <div>
          <Label htmlFor="link_url" className="mb-1 block">
            Link URL (optional)
          </Label>
          <Input
            id="link_url"
            value={form.link_url}
            onChange={(e) => set("link_url", e.target.value)}
            placeholder="/account/wishlist"
          />
        </div>
      </div>

      <div className="border-t border-ui-border-base pt-4">
        <Text weight="plus" className="mb-3">
          Channels (at least one required)
        </Text>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.channel_inapp}
              onChange={(e) => set("channel_inapp", e.target.checked)}
            />
            <Text size="small">Notify in-app inbox</Text>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.channel_email}
              onChange={(e) => set("channel_email", e.target.checked)}
            />
            <Text size="small">Send email</Text>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.create_banner}
              onChange={(e) => set("create_banner", e.target.checked)}
            />
            <Text size="small">Also show as a site banner</Text>
          </label>
        </div>
        {!hasChannel && (
          <Text size="small" className="text-ui-fg-error mt-1">
            Select at least one of in-app inbox or email.
          </Text>
        )}
      </div>

      <div className="border-t border-ui-border-base pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Button
            size="small"
            variant={form.targeting_mode === "filters" ? "primary" : "secondary"}
            onClick={() => set("targeting_mode", "filters")}
          >
            By filters
          </Button>
          <Button
            size="small"
            variant={form.targeting_mode === "customers" ? "primary" : "secondary"}
            onClick={() => set("targeting_mode", "customers")}
          >
            Specific customers
          </Button>
        </div>

        {form.targeting_mode === "customers" ? (
          <CustomerPicker
            selected={form.selectedCustomers}
            setSelected={(c) => set("selectedCustomers", c)}
          />
        ) : (
          <>
            <Text size="small" className="text-ui-fg-subtle mb-3">
              All filters below are combined — leave blank to target everyone.
            </Text>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block">VIP tier and above</Label>
                <Select
                  value={toSelectValue(form.vip_tier_min)}
                  onValueChange={(v) => set("vip_tier_min", fromSelectValue(v))}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Any tier" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value={ANY_VALUE}>Any tier</Select.Item>
                    {VIP_TIERS.map((t) => (
                      <Select.Item key={t} value={t}>
                        {t}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Opted into category</Label>
                <Select
                  value={toSelectValue(form.category_optin)}
                  onValueChange={(v) => set("category_optin", fromSelectValue(v))}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Any category" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value={ANY_VALUE}>Any category</Select.Item>
                    {CATEGORIES.map((c) => (
                      <Select.Item key={c} value={c}>
                        {c}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Follows brewery</Label>
                <Select
                  value={toSelectValue(form.brewery_id)}
                  onValueChange={(v) => set("brewery_id", fromSelectValue(v))}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Any brewery" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value={ANY_VALUE}>Any brewery</Select.Item>
                    {breweries.map((b) => (
                      <Select.Item key={b.id} value={b.id}>
                        {b.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Follows hop</Label>
                <Select
                  value={toSelectValue(form.hop_id)}
                  onValueChange={(v) => set("hop_id", fromSelectValue(v))}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Any hop" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value={ANY_VALUE}>Any hop</Select.Item>
                    {hops.map((h) => (
                      <Select.Item key={h.id} value={h.id}>
                        {h.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Account status</Label>
                <Select
                  value={toSelectValue(form.account_status)}
                  onValueChange={(v) => set("account_status", fromSelectValue(v))}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Any status" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value={ANY_VALUE}>Any status</Select.Item>
                    {ACCOUNT_STATUSES.map((s) => (
                      <Select.Item key={s} value={s}>
                        {s}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.has_ordered}
                    onChange={(e) => set("has_ordered", e.target.checked)}
                  />
                  <Text size="small">Has placed an order</Text>
                </label>
              </div>
            </div>
          </>
        )}

        <div className="flex items-center gap-3 mt-3">
          <Button variant="secondary" size="small" onClick={handlePreview} isLoading={previewing}>
            Preview recipients
          </Button>
          {previewCount !== null && (
            <Text size="small" className="text-ui-fg-subtle">
              ~{previewCount} customer{previewCount === 1 ? "" : "s"} will be reached
            </Text>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-ui-border-base">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => onSaveDraft(form)} disabled={saving || !valid}>
          Save as draft
        </Button>
        <Button onClick={handleSend} disabled={saving || !valid} isLoading={saving}>
          Send broadcast
        </Button>
      </div>
    </div>
  )
}

const BroadcastsPage = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [breweries, setBreweries] = useState<Option[]>([])
  const [hops, setHops] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Broadcast | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [broadcastsRes, breweriesRes, hopsRes] = await Promise.all([
        sdk.client.fetch<{ broadcasts: Broadcast[] }>("/admin/broadcasts", { method: "GET" }),
        sdk.client.fetch<{ breweries: Option[] }>("/admin/breweries", { method: "GET" }),
        sdk.client.fetch<{ hops: Option[] }>("/admin/hops", { method: "GET" }),
      ])
      setBroadcasts(broadcastsRes.broadcasts ?? [])
      setBreweries(breweriesRes.breweries ?? [])
      setHops(hopsRes.hops ?? [])
    } catch {
      toast.error("Failed to load broadcasts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (b: Broadcast) => {
    if (b.status !== "draft") return
    setEditing(b)
    setModalOpen(true)
  }

  const submit = async (form: FormState, send: boolean) => {
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        link_text: form.link_text.trim() || null,
        link_url: form.link_url.trim() || null,
        segment_filter: formToSegmentFilter(form),
        channel_inapp: form.channel_inapp,
        channel_email: form.channel_email,
        create_banner: form.create_banner,
      }

      if (editing) {
        await sdk.client.fetch(`/admin/broadcasts/${editing.id}`, {
          method: "POST",
          body: { action: "update", ...payload },
        })
        if (send) {
          await sdk.client.fetch(`/admin/broadcasts/${editing.id}`, {
            method: "POST",
            body: { action: "send" },
          })
        }
        toast.success(send ? "Broadcast queued for sending" : "Draft updated")
      } else {
        await sdk.client.fetch("/admin/broadcasts", {
          method: "POST",
          body: { ...payload, send },
        })
        toast.success(send ? "Broadcast queued for sending" : "Draft saved")
      }
      setModalOpen(false)
      setEditing(null)
      load()
    } catch {
      toast.error("Failed to save broadcast")
    } finally {
      setSaving(false)
    }
  }

  const segmentSummary = (f: SegmentFilter) => {
    if (f.mode === "customers") {
      const n = f.customer_ids?.length ?? 0
      return `${n} specific customer${n === 1 ? "" : "s"}`
    }
    const parts: string[] = []
    if (f.vip_tier_min) parts.push(`${f.vip_tier_min}+`)
    if (f.category_optin) parts.push(`opted in: ${f.category_optin}`)
    if (f.brewery_id) parts.push("brewery follow")
    if (f.hop_id) parts.push("hop follow")
    if (f.has_ordered) parts.push("has ordered")
    if (f.account_status) parts.push(f.account_status)
    return parts.length ? parts.join(", ") : "All customers"
  }

  const channelBadges = (b: Broadcast) => (
    <div className="flex gap-1 flex-wrap">
      {b.channel_inapp && (
        <Badge size="2xsmall" color="blue">
          Inbox
        </Badge>
      )}
      {b.channel_email && (
        <Badge size="2xsmall" color="purple">
          Email
        </Badge>
      )}
      {b.create_banner && (
        <Badge size="2xsmall" color="orange">
          Banner
        </Badge>
      )}
    </div>
  )

  const sorted = [...broadcasts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <>
      <Container>
        <div className="flex items-center justify-between mb-4">
          <Heading level="h1">Broadcasts</Heading>
          <Button onClick={openCreate} size="small">
            + New Broadcast
          </Button>
        </div>

        {loading ? (
          <Text className="text-ui-fg-subtle">Loading…</Text>
        ) : sorted.length === 0 ? (
          <Text className="text-ui-fg-subtle">
            No broadcasts yet. Create one to email and notify customers.
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Title</Table.HeaderCell>
                <Table.HeaderCell>Segment</Table.HeaderCell>
                <Table.HeaderCell>Channels</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Recipients</Table.HeaderCell>
                <Table.HeaderCell>Sent</Table.HeaderCell>
                <Table.HeaderCell>Failed</Table.HeaderCell>
                <Table.HeaderCell>Sent at</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sorted.map((b) => (
                <Table.Row
                  key={b.id}
                  className={b.status === "draft" ? "cursor-pointer" : ""}
                  onClick={() => openEdit(b)}
                >
                  <Table.Cell className="max-w-xs">
                    <Text className="truncate" weight="plus">
                      {b.title}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-subtle">
                      {segmentSummary(b.segment_filter ?? {})}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>{channelBadges(b)}</Table.Cell>
                  <Table.Cell>{statusBadge(b.status)}</Table.Cell>
                  <Table.Cell>{b.recipient_count}</Table.Cell>
                  <Table.Cell>{b.sent_count}</Table.Cell>
                  <Table.Cell>{b.failed_count}</Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-subtle">
                      {b.sent_at ? new Date(b.sent_at).toLocaleString() : "—"}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Container>

      <FocusModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setEditing(null)
        }}
      >
        <FocusModal.Content>
          <FocusModal.Header>
            <Heading>{editing ? "Edit draft" : "New broadcast"}</Heading>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-auto">
            <ComposerForm
              key={editing?.id ?? "new"}
              initial={editing ? formFromBroadcast(editing) : EMPTY_FORM}
              breweries={breweries}
              hops={hops}
              onSend={(f) => submit(f, true)}
              onSaveDraft={(f) => submit(f, false)}
              onCancel={() => {
                setModalOpen(false)
                setEditing(null)
              }}
              saving={saving}
            />
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </>
  )
}

export const config = defineRouteConfig({
  label: "Broadcasts",
})

export default BroadcastsPage
