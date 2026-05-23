import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Table,
  Drawer,
  Select,
  Textarea,
  Badge,
  Tabs,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type Campaign = {
  id: string
  title: string
  slug: string
  type: "flash_sale" | "vip_exclusive" | "aging_markdown"
  description: string | null
  starts_at: string
  ends_at: string | null
  target_customer_groups: string[]
  target_product_ids: string[]
  discount_type: "percentage" | "fixed"
  discount_value: number
  price_list_id: string | null
  status: "draft" | "scheduled" | "active" | "expired"
}

type AgingCandidate = {
  id: string
  product_id: string
  variant_id: string
  product_title: string | null
  packaged_date: string
  days_aged: number
  status: "pending" | "approved" | "dismissed"
  campaign_id: string | null
}

const TYPE_BADGES: Record<string, { label: string; color: "red" | "purple" | "orange" }> = {
  flash_sale: { label: "Flash Sale", color: "red" },
  vip_exclusive: { label: "VIP Exclusive", color: "purple" },
  aging_markdown: { label: "Aging Markdown", color: "orange" },
}

const STATUS_BADGES: Record<string, { label: string; color: "grey" | "blue" | "green" | "red" }> = {
  draft: { label: "Draft", color: "grey" },
  scheduled: { label: "Scheduled", color: "blue" },
  active: { label: "Active", color: "green" },
  expired: { label: "Expired", color: "red" },
}

function CampaignForm({
  onSave,
  onCancel,
  saving,
  error,
}: {
  onSave: (payload: any) => Promise<void>
  onCancel: () => void
  saving: boolean
  error: string | null
}) {
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [type, setType] = useState<string>("flash_sale")
  const [description, setDescription] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [discountType, setDiscountType] = useState<string>("percentage")
  const [discountValue, setDiscountValue] = useState("10")
  const [productIds, setProductIds] = useState("")
  const [customerGroups, setCustomerGroups] = useState("")

  const handleSave = () => {
    onSave({
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      type,
      description: description || null,
      starts_at: startsAt || new Date().toISOString(),
      ends_at: endsAt || null,
      discount_type: discountType,
      discount_value: Number(discountValue),
      target_product_ids: productIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      target_customer_groups: customerGroups
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      status: "scheduled",
    })
  }

  return (
    <Drawer.Body className="space-y-3 overflow-y-auto">
      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="10% off Tree House — 24h Flash" />
      </div>
      <div>
        <Label>Slug</Label>
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated from title" />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={type} onValueChange={setType}>
          <Select.Trigger><Select.Value /></Select.Trigger>
          <Select.Content>
            <Select.Item value="flash_sale">Flash Sale</Select.Item>
            <Select.Item value="vip_exclusive">VIP Exclusive</Select.Item>
            <Select.Item value="aging_markdown">Aging Markdown</Select.Item>
          </Select.Content>
        </Select>
      </div>
      <div>
        <Label>Description (shown to customers)</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Starts at</Label>
          <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div>
          <Label>Ends at (optional)</Label>
          <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Discount type</Label>
          <Select value={discountType} onValueChange={setDiscountType}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              <Select.Item value="percentage">Percentage (%)</Select.Item>
              <Select.Item value="fixed">Fixed ($)</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div>
          <Label>Discount value</Label>
          <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Product IDs (comma-separated)</Label>
        <Textarea rows={2} value={productIds} onChange={(e) => setProductIds(e.target.value)} placeholder="prod_01ABC, prod_02DEF" />
      </div>
      <div>
        <Label>Customer group IDs (comma-separated, empty = all members)</Label>
        <Input value={customerGroups} onChange={(e) => setCustomerGroups(e.target.value)} placeholder="Leave empty for all approved+" />
      </div>
      {error && <p className="text-ui-fg-error text-sm">{error}</p>}
      <div className="flex justify-end gap-2 pt-3">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button isLoading={saving} onClick={handleSave}>Create Campaign</Button>
      </div>
    </Drawer.Body>
  )
}

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await sdk.client.fetch<{ campaigns: Campaign[] }>("/admin/specials")
      setCampaigns(data.campaigns || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (payload: any) => {
    setError(null)
    setSaving(true)
    try {
      await sdk.client.fetch("/admin/specials", { method: "POST", body: payload })
      setShowCreate(false)
      load()
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleActivate = async (id: string) => {
    await sdk.client.fetch(`/admin/specials/${id}/activate`, { method: "POST" })
    load()
  }

  const handleExpire = async (id: string) => {
    await sdk.client.fetch(`/admin/specials/${id}/expire`, { method: "POST" })
    load()
  }

  const handleDelete = async (id: string) => {
    await sdk.client.fetch(`/admin/specials/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreate(true)}>Create Campaign</Button>
      </div>

      {loading ? (
        <p className="text-ui-fg-muted">Loading…</p>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Title</Table.HeaderCell>
              <Table.HeaderCell>Type</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Discount</Table.HeaderCell>
              <Table.HeaderCell>Products</Table.HeaderCell>
              <Table.HeaderCell>Dates</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {campaigns.map((c) => {
              const tb = TYPE_BADGES[c.type]
              const sb = STATUS_BADGES[c.status]
              return (
                <Table.Row key={c.id}>
                  <Table.Cell className="font-medium">{c.title}</Table.Cell>
                  <Table.Cell><Badge color={tb?.color}>{tb?.label}</Badge></Table.Cell>
                  <Table.Cell><Badge color={sb?.color}>{sb?.label}</Badge></Table.Cell>
                  <Table.Cell>
                    {c.discount_value}{c.discount_type === "percentage" ? "%" : " AUD"} off
                  </Table.Cell>
                  <Table.Cell>{c.target_product_ids?.length || 0}</Table.Cell>
                  <Table.Cell className="text-xs">
                    {new Date(c.starts_at).toLocaleDateString()}
                    {c.ends_at ? ` → ${new Date(c.ends_at).toLocaleDateString()}` : " → ongoing"}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-1">
                      {["draft", "scheduled"].includes(c.status) && (
                        <Button size="small" onClick={() => handleActivate(c.id)}>Activate</Button>
                      )}
                      {c.status === "active" && (
                        <Button size="small" variant="secondary" onClick={() => handleExpire(c.id)}>Expire</Button>
                      )}
                      {c.status !== "active" && (
                        <Button size="small" variant="danger" onClick={() => handleDelete(c.id)}>Delete</Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      )}

      <Drawer open={showCreate} onOpenChange={(o) => { if (!o) setShowCreate(false) }}>
        <Drawer.Content>
          <Drawer.Header><Drawer.Title>Create Campaign</Drawer.Title></Drawer.Header>
          <CampaignForm
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
            saving={saving}
            error={error}
          />
        </Drawer.Content>
      </Drawer>
    </div>
  )
}

function AgingTab() {
  const [candidates, setCandidates] = useState<AgingCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [markdownId, setMarkdownId] = useState<string | null>(null)
  const [discountType, setDiscountType] = useState<string>("fixed")
  const [discountValue, setDiscountValue] = useState("2")
  const [actioning, setActioning] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await sdk.client.fetch<{ candidates: AgingCandidate[] }>("/admin/aging-candidates")
      setCandidates(data.candidates || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleApprove = async (id: string) => {
    setActioning(true)
    try {
      await sdk.client.fetch(`/admin/aging-candidates/${id}/approve`, {
        method: "POST",
        body: { discount_type: discountType, discount_value: Number(discountValue) },
      })
      setMarkdownId(null)
      load()
    } finally {
      setActioning(false)
    }
  }

  const handleDismiss = async (id: string) => {
    setActioning(true)
    try {
      await sdk.client.fetch(`/admin/aging-candidates/${id}/dismiss`, {
        method: "POST",
        body: { reason: "Ages well" },
      })
      load()
    } finally {
      setActioning(false)
    }
  }

  return (
    <div>
      <p className="text-ui-fg-subtle text-sm mb-4">
        Products with packaged_date older than 60 days. Approve to create a markdown, or dismiss if the beer ages well.
      </p>

      {loading ? (
        <p className="text-ui-fg-muted">Loading…</p>
      ) : candidates.length === 0 ? (
        <p className="text-ui-fg-muted">No aging candidates pending review.</p>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Product</Table.HeaderCell>
              <Table.HeaderCell>Packaged</Table.HeaderCell>
              <Table.HeaderCell>Days Aged</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {candidates.map((c) => (
              <Table.Row key={c.id}>
                <Table.Cell className="font-medium">{c.product_title || c.product_id}</Table.Cell>
                <Table.Cell className="text-sm">
                  {new Date(c.packaged_date).toLocaleDateString()}
                </Table.Cell>
                <Table.Cell>
                  <Badge color={c.days_aged > 90 ? "red" : "orange"}>{c.days_aged}d</Badge>
                </Table.Cell>
                <Table.Cell>
                  {markdownId === c.id ? (
                    <div className="flex gap-2 items-center">
                      <Select value={discountType} onValueChange={setDiscountType}>
                        <Select.Trigger className="w-20"><Select.Value /></Select.Trigger>
                        <Select.Content>
                          <Select.Item value="fixed">$</Select.Item>
                          <Select.Item value="percentage">%</Select.Item>
                        </Select.Content>
                      </Select>
                      <Input
                        type="number"
                        className="w-16"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                      />
                      <Button size="small" isLoading={actioning} onClick={() => handleApprove(c.id)}>
                        Apply
                      </Button>
                      <Button size="small" variant="secondary" onClick={() => setMarkdownId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="small" onClick={() => setMarkdownId(c.id)}>Mark Down</Button>
                      <Button size="small" variant="secondary" isLoading={actioning} onClick={() => handleDismiss(c.id)}>
                        Dismiss
                      </Button>
                    </div>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  )
}

const CampaignsPage = () => {
  return (
    <Container>
      <Heading level="h1" className="mb-4">Campaigns & Specials</Heading>
      <Tabs defaultValue="campaigns">
        <Tabs.List>
          <Tabs.Trigger value="campaigns">Campaigns</Tabs.Trigger>
          <Tabs.Trigger value="aging">Aging Candidates</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="campaigns"><CampaignsTab /></Tabs.Content>
        <Tabs.Content value="aging"><AgingTab /></Tabs.Content>
      </Tabs>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Campaigns",
})

export default CampaignsPage
