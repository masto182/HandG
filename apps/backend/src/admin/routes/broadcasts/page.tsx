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
  status: "draft" | "sending" | "sent" | "failed"
  recipient_count: number
  sent_count: number
  failed_count: number
  sent_at: string | null
  created_at: string
}

type SegmentFilter = {
  vip_tier_min?: string
  category_optin?: string
  brewery_id?: string
  hop_id?: string
  has_ordered?: boolean
  account_status?: string
}

type Option = { id: string; name: string }

type FormState = {
  title: string
  body: string
  link_text: string
  link_url: string
  vip_tier_min: string
  category_optin: string
  brewery_id: string
  hop_id: string
  has_ordered: boolean
  account_status: string
}

const EMPTY_FORM: FormState = {
  title: "",
  body: "",
  link_text: "",
  link_url: "",
  vip_tier_min: "",
  category_optin: "",
  brewery_id: "",
  hop_id: "",
  has_ordered: false,
  account_status: "",
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

function statusBadge(status: Broadcast["status"]) {
  if (status === "sent") return <Badge color="green">Sent</Badge>
  if (status === "sending") return <Badge color="orange">Sending</Badge>
  if (status === "failed") return <Badge color="red">Failed</Badge>
  return <Badge color="grey">Draft</Badge>
}

function formToSegmentFilter(form: FormState): SegmentFilter {
  const filter: SegmentFilter = {}
  if (form.vip_tier_min) filter.vip_tier_min = form.vip_tier_min
  if (form.category_optin) filter.category_optin = form.category_optin
  if (form.brewery_id) filter.brewery_id = form.brewery_id
  if (form.hop_id) filter.hop_id = form.hop_id
  if (form.has_ordered) filter.has_ordered = true
  if (form.account_status) filter.account_status = form.account_status
  return filter
}

function ComposerForm({
  breweries,
  hops,
  onSend,
  onSaveDraft,
  onCancel,
  saving,
}: {
  breweries: Option[]
  hops: Option[]
  onSend: (f: FormState) => void
  onSaveDraft: (f: FormState) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
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
      description: `This will email and notify ${
        previewCount ?? "an unknown number of"
      } customers. This cannot be undone. Continue?`,
      confirmText: "Send",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    onSend(form)
  }

  const valid = form.title.trim() && form.body.trim()

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
          Segment (all filters below are combined — leave blank to target everyone)
        </Text>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-1 block">VIP tier and above</Label>
            <Select value={form.vip_tier_min} onValueChange={(v) => set("vip_tier_min", v)}>
              <Select.Trigger>
                <Select.Value placeholder="Any tier" />
              </Select.Trigger>
              <Select.Content>
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
            <Select value={form.category_optin} onValueChange={(v) => set("category_optin", v)}>
              <Select.Trigger>
                <Select.Value placeholder="Any category" />
              </Select.Trigger>
              <Select.Content>
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
            <Select value={form.brewery_id} onValueChange={(v) => set("brewery_id", v)}>
              <Select.Trigger>
                <Select.Value placeholder="Any brewery" />
              </Select.Trigger>
              <Select.Content>
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
            <Select value={form.hop_id} onValueChange={(v) => set("hop_id", v)}>
              <Select.Trigger>
                <Select.Value placeholder="Any hop" />
              </Select.Trigger>
              <Select.Content>
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
            <Select value={form.account_status} onValueChange={(v) => set("account_status", v)}>
              <Select.Trigger>
                <Select.Value placeholder="Any status" />
              </Select.Trigger>
              <Select.Content>
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

  const submit = async (form: FormState, send: boolean) => {
    setSaving(true)
    try {
      await sdk.client.fetch("/admin/broadcasts", {
        method: "POST",
        body: {
          title: form.title.trim(),
          body: form.body.trim(),
          link_text: form.link_text.trim() || null,
          link_url: form.link_url.trim() || null,
          segment_filter: formToSegmentFilter(form),
          send,
        },
      })
      toast.success(send ? "Broadcast queued for sending" : "Draft saved")
      setModalOpen(false)
      load()
    } catch {
      toast.error("Failed to save broadcast")
    } finally {
      setSaving(false)
    }
  }

  const segmentSummary = (f: SegmentFilter) => {
    const parts: string[] = []
    if (f.vip_tier_min) parts.push(`${f.vip_tier_min}+`)
    if (f.category_optin) parts.push(`opted in: ${f.category_optin}`)
    if (f.brewery_id) parts.push("brewery follow")
    if (f.hop_id) parts.push("hop follow")
    if (f.has_ordered) parts.push("has ordered")
    if (f.account_status) parts.push(f.account_status)
    return parts.length ? parts.join(", ") : "All customers"
  }

  const sorted = [...broadcasts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <>
      <Container>
        <div className="flex items-center justify-between mb-4">
          <Heading level="h1">Broadcasts</Heading>
          <Button onClick={() => setModalOpen(true)} size="small">
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
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Recipients</Table.HeaderCell>
                <Table.HeaderCell>Sent</Table.HeaderCell>
                <Table.HeaderCell>Failed</Table.HeaderCell>
                <Table.HeaderCell>Sent at</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sorted.map((b) => (
                <Table.Row key={b.id}>
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

      <FocusModal open={modalOpen} onOpenChange={setModalOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Heading>New broadcast</Heading>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-auto">
            <ComposerForm
              breweries={breweries}
              hops={hops}
              onSend={(f) => submit(f, true)}
              onSaveDraft={(f) => submit(f, false)}
              onCancel={() => setModalOpen(false)}
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
