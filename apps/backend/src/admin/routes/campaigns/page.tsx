import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  Badge,
  Table,
  Drawer,
  FocusModal,
  Tabs,
  Checkbox,
  Text,
  toast,
  usePrompt,
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
  batch_id: string | null
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

type ProductLite = { id: string; title: string; thumbnail?: string | null }
type Group = { id: string; name: string }

const TYPE_BADGES: Record<string, { label: string; color: "red" | "purple" | "orange" }> = {
  flash_sale: { label: "Flash Sale", color: "red" },
  vip_exclusive: { label: "VIP Exclusive", color: "purple" },
  aging_markdown: { label: "Aging Markdown", color: "orange" },
}

const LIFECYCLE = ["draft", "scheduled", "active", "expired"] as const

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—"

const toLocalInput = (iso?: string | null) => {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(
    d.getMinutes()
  )}`
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null)

function LifecyclePill({ status }: { status: Campaign["status"] }) {
  const idx = LIFECYCLE.indexOf(status as any)
  const color =
    status === "active"
      ? "text-ui-tag-green-text"
      : status === "scheduled"
        ? "text-ui-tag-blue-text"
        : status === "expired"
          ? "text-ui-tag-red-text"
          : "text-ui-fg-muted"
  return (
    <div className="flex items-center gap-1.5">
      {LIFECYCLE.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              i === idx
                ? status === "active"
                  ? "bg-ui-tag-green-icon"
                  : status === "scheduled"
                    ? "bg-ui-tag-blue-icon"
                    : status === "expired"
                      ? "bg-ui-tag-red-icon"
                      : "bg-ui-fg-muted"
                : "bg-ui-border-base"
            }`}
          />
          {i < LIFECYCLE.length - 1 && <span className="w-3 h-px bg-ui-border-base" />}
        </div>
      ))}
      <span className={`text-xs ml-1 capitalize ${color}`}>{status}</span>
    </div>
  )
}

type FormState = {
  title: string
  slug: string
  slugTouched: boolean
  type: string
  description: string
  starts_at: string
  ends_at: string
  discount_type: string
  discount_value: string
}

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  slugTouched: false,
  type: "flash_sale",
  description: "",
  starts_at: "",
  ends_at: "",
  discount_type: "percentage",
  discount_value: "10",
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

function CampaignFields({
  form,
  set,
  products,
  setProducts,
  groups,
  selectedGroups,
  setSelectedGroups,
}: {
  form: FormState
  set: (p: Partial<FormState>) => void
  products: ProductLite[]
  setProducts: (p: ProductLite[]) => void
  groups: Group[]
  selectedGroups: string[]
  setSelectedGroups: (g: string[]) => void
}) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<ProductLite[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      setSearching(true)
      sdk.admin.product
        .list({ q, limit: 8, fields: "id,title,thumbnail" } as any)
        .then((r: any) => setResults(r.products || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const addProduct = (p: ProductLite) => {
    if (!products.find((x) => x.id === p.id)) setProducts([...products, p])
  }
  const removeProduct = (id: string) => setProducts(products.filter((x) => x.id !== id))
  const toggleGroup = (id: string) =>
    setSelectedGroups(
      selectedGroups.includes(id) ? selectedGroups.filter((g) => g !== id) : [...selectedGroups, id]
    )

  const isVipType = form.type === "vip_exclusive"

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label size="small" weight="plus">
          Title
        </Label>
        <Input
          value={form.title}
          onChange={(e) =>
            set({
              title: e.target.value,
              ...(form.slugTouched ? {} : { slug: slugify(e.target.value) }),
            })
          }
          placeholder="10% off Garage Project — 48h Flash"
        />
        <Text size="small" className="text-ui-fg-muted">
          Slug: {form.slug || "—"}
        </Text>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label size="small" weight="plus">
            Type
          </Label>
          <Select value={form.type} onValueChange={(v) => set({ type: v })}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="flash_sale">Flash Sale</Select.Item>
              <Select.Item value="vip_exclusive">VIP Exclusive</Select.Item>
              <Select.Item value="aging_markdown">Aging Markdown</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div className="space-y-1">
          <Label size="small" weight="plus">
            Discount
          </Label>
          <div className="flex gap-2">
            <Select value={form.discount_type} onValueChange={(v) => set({ discount_type: v })}>
              <Select.Trigger className="w-32">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="percentage">Percentage (%)</Select.Item>
                <Select.Item value="fixed">Fixed ($)</Select.Item>
              </Select.Content>
            </Select>
            <Input
              type="number"
              value={form.discount_value}
              onChange={(e) => set({ discount_value: e.target.value })}
            />
          </div>
          <Text size="small" className="text-ui-fg-muted">
            {form.discount_type === "percentage"
              ? `${form.discount_value || 0}% off selected products`
              : `$${form.discount_value || 0} off selected products`}
          </Text>
        </div>
      </div>

      <div className="space-y-1">
        <Label size="small" weight="plus">
          Description (shown to members)
        </Label>
        <Input value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label size="small" weight="plus">
            Starts at
          </Label>
          <Input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => set({ starts_at: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label size="small" weight="plus">
            Ends at (optional)
          </Label>
          <Input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => set({ ends_at: e.target.value })}
          />
        </div>
      </div>

      {/* Product picker */}
      <div className="space-y-2">
        <Label size="small" weight="plus">
          Products
        </Label>
        {products.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-1.5 bg-ui-bg-subtle border border-ui-border-base rounded-md pl-1 pr-2 py-1 text-sm"
              >
                {p.thumbnail && (
                  <img src={p.thumbnail} alt="" className="w-5 h-5 rounded object-cover" />
                )}
                {p.title}
                <button
                  type="button"
                  onClick={() => removeProduct(p.id)}
                  className="text-ui-fg-muted hover:text-ui-fg-base"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
        <Input
          placeholder="Search products to add…"
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
            {results.map((p) => {
              const added = !!products.find((x) => x.id === p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={added}
                  onClick={() => addProduct(p)}
                  className="flex items-center gap-2 w-full text-left p-2 hover:bg-ui-bg-subtle disabled:opacity-50"
                >
                  {p.thumbnail && (
                    <img src={p.thumbnail} alt="" className="w-6 h-6 rounded object-cover" />
                  )}
                  <span className="text-sm flex-1">{p.title}</span>
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
          {products.length} product{products.length === 1 ? "" : "s"} selected
        </Text>
      </div>

      {/* Group picker */}
      <div className="space-y-2">
        <Label size="small" weight="plus">
          Visible to
        </Label>
        <div className="flex flex-wrap gap-3">
          {groups.map((g) => (
            <label key={g.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedGroups.includes(g.id)}
                onCheckedChange={() => toggleGroup(g.id)}
              />
              {g.name}
            </label>
          ))}
        </div>
        <Text size="small" className="text-ui-fg-muted">
          {isVipType
            ? "VIP tiers suggested for VIP Exclusive campaigns."
            : "Leave empty for all approved members."}
        </Text>
      </div>

      <div className="rounded-md bg-ui-bg-subtle p-2">
        <Text size="small" className="text-ui-fg-muted">
          Activating creates a Medusa price list and applies it to the selected products.
        </Text>
      </div>
    </div>
  )
}

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"create" | "edit" | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [selProducts, setSelProducts] = useState<ProductLite[]>([])
  const [selGroups, setSelGroups] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const prompt = usePrompt()

  const set = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }))

  const load = async () => {
    setLoading(true)
    try {
      const data = await sdk.client.fetch<{ campaigns: Campaign[] }>("/admin/specials")
      setCampaigns(data.campaigns || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    sdk.admin.customerGroup
      .list({ limit: 100, fields: "id,name" } as any)
      .then((r: any) => setGroups(r.customer_groups || []))
      .catch(() => setGroups([]))
  }, [])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setSelProducts([])
    setSelGroups([])
    setEditingId(null)
    setMode("create")
  }

  const openEdit = async (c: Campaign) => {
    setForm({
      title: c.title,
      slug: c.slug,
      slugTouched: true,
      type: c.type,
      description: c.description || "",
      starts_at: toLocalInput(c.starts_at),
      ends_at: toLocalInput(c.ends_at),
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
    })
    setSelGroups(c.target_customer_groups || [])
    setEditingId(c.id)
    setMode("edit")
    setSelProducts([])
    if (c.target_product_ids?.length) {
      try {
        const r: any = await sdk.admin.product.list({
          id: c.target_product_ids,
          fields: "id,title,thumbnail",
          limit: 100,
        } as any)
        setSelProducts(r.products || [])
      } catch {
        setSelProducts(c.target_product_ids.map((id) => ({ id, title: id })))
      }
    }
  }

  const close = () => {
    setMode(null)
    setEditingId(null)
  }

  const buildBody = () => ({
    title: form.title,
    slug: form.slug || slugify(form.title),
    type: form.type,
    description: form.description || null,
    starts_at: fromLocalInput(form.starts_at) || new Date().toISOString(),
    ends_at: fromLocalInput(form.ends_at),
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value),
    target_product_ids: selProducts.map((p) => p.id),
    target_customer_groups: selGroups,
  })

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required")
      return
    }
    setSaving(true)
    try {
      if (mode === "create") {
        await sdk.client.fetch("/admin/specials", { method: "POST", body: buildBody() })
        toast.success("Campaign created (scheduled)")
      } else if (editingId) {
        await sdk.client.fetch(`/admin/specials/${editingId}`, {
          method: "POST",
          body: buildBody(),
        })
        toast.success("Campaign updated")
      }
      close()
      load()
    } catch (e: any) {
      toast.error(e?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const lifecycle = async (id: string, action: "activate" | "expire") => {
    const ok = await prompt({
      title: action === "expire" ? "Expire campaign?" : "Activate campaign?",
      description:
        action === "expire"
          ? "This will immediately end the campaign. Active promotions will stop applying."
          : "This will activate the campaign and make its promotions live.",
      confirmText: action === "expire" ? "Expire" : "Activate",
      cancelText: "Cancel",
      variant: action === "expire" ? "danger" : "confirmation",
    })
    if (!ok) return
    try {
      await sdk.client.fetch(`/admin/specials/${id}/${action}`, { method: "POST" })
      toast.success(`Campaign ${action}d`)
      load()
    } catch (e: any) {
      toast.error(e?.message || "Action failed")
    }
  }

  const handleDelete = async (c: Campaign) => {
    const ok = await prompt({
      title: `Delete "${c.title}"?`,
      description: "This removes the campaign and its price list.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    })
    if (!ok) return
    try {
      await sdk.client.fetch(`/admin/specials/${c.id}`, { method: "DELETE" })
      toast.success("Campaign deleted")
      load()
    } catch (e: any) {
      toast.error(e?.message || "Delete failed")
    }
  }

  const FormActions = (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="small" onClick={close} disabled={saving}>
        Cancel
      </Button>
      <Button size="small" onClick={handleSave} isLoading={saving} disabled={!form.title.trim()}>
        {mode === "create" ? "Create campaign" : "Save changes"}
      </Button>
    </div>
  )

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="small" onClick={openCreate}>
          Create campaign
        </Button>
      </div>

      {loading ? (
        <Text className="text-ui-fg-muted">Loading…</Text>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Title</Table.HeaderCell>
              <Table.HeaderCell>Type</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Discount</Table.HeaderCell>
              <Table.HeaderCell>Products</Table.HeaderCell>
              <Table.HeaderCell>Schedule</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {campaigns.map((c) => {
              const tb = TYPE_BADGES[c.type]
              return (
                <Table.Row key={c.id}>
                  <Table.Cell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {c.title}
                      {c.price_list_id && (
                        <span title="Price list active" className="text-ui-fg-muted text-xs">
                          (price list)
                        </span>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" color={tb?.color}>
                      {tb?.label}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <LifecyclePill status={c.status} />
                  </Table.Cell>
                  <Table.Cell>
                    {c.discount_value}
                    {c.discount_type === "percentage" ? "%" : " AUD"} off
                  </Table.Cell>
                  <Table.Cell>{c.target_product_ids?.length || 0}</Table.Cell>
                  <Table.Cell className="text-xs text-ui-fg-subtle">
                    {fmtDate(c.starts_at)}
                    {c.ends_at ? ` → ${fmtDate(c.ends_at)}` : " → ongoing"}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-1">
                      {["draft", "scheduled"].includes(c.status) && (
                        <>
                          <Button size="small" variant="secondary" onClick={() => openEdit(c)}>
                            Edit
                          </Button>
                          <Button size="small" onClick={() => lifecycle(c.id, "activate")}>
                            Activate
                          </Button>
                        </>
                      )}
                      {c.status === "active" && (
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() => lifecycle(c.id, "expire")}
                        >
                          Expire
                        </Button>
                      )}
                      {c.status !== "active" && (
                        <Button size="small" variant="danger" onClick={() => handleDelete(c)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              )
            })}
            {campaigns.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={7}>
                  <div className="text-center text-ui-fg-subtle py-8">No campaigns yet.</div>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      )}

      {/* Create — FocusModal */}
      <FocusModal open={mode === "create"} onOpenChange={(o) => !o && close()}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Text weight="plus">Create campaign</Text>
            {FormActions}
          </FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              <CampaignFields
                form={form}
                set={set}
                products={selProducts}
                setProducts={setSelProducts}
                groups={groups}
                selectedGroups={selGroups}
                setSelectedGroups={setSelGroups}
              />
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      {/* Edit — Drawer */}
      <Drawer open={mode === "edit"} onOpenChange={(o) => !o && close()}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit campaign</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="overflow-y-auto">
            <CampaignFields
              form={form}
              set={set}
              products={selProducts}
              setProducts={setSelProducts}
              groups={groups}
              selectedGroups={selGroups}
              setSelectedGroups={setSelGroups}
            />
          </Drawer.Body>
          <Drawer.Footer>{FormActions}</Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </div>
  )
}

const suggestedMarkdown = (days: number) => (days >= 90 ? 25 : 15)

function AgingTab() {
  const [candidates, setCandidates] = useState<AgingCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [discountType, setDiscountType] = useState("percentage")
  const [discountValue, setDiscountValue] = useState("15")
  const [actioning, setActioning] = useState(false)
  const prompt = usePrompt()

  const load = async () => {
    setLoading(true)
    try {
      const data = await sdk.client.fetch<{ candidates: AgingCandidate[] }>(
        "/admin/aging-candidates"
      )
      setCandidates(data.candidates || [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const bulkMarkdown = async () => {
    const ids = [...selected]
    if (!ids.length) return
    setActioning(true)
    try {
      for (const id of ids) {
        await sdk.client.fetch(`/admin/aging-candidates/${id}/approve`, {
          method: "POST",
          body: { discount_type: discountType, discount_value: Number(discountValue) },
        })
      }
      toast.success(`Marked down ${ids.length} product${ids.length > 1 ? "s" : ""}`)
      setSelected(new Set())
      load()
    } catch (e: any) {
      toast.error(e?.message || "Markdown failed")
    } finally {
      setActioning(false)
    }
  }

  const bulkDismiss = async () => {
    const ids = [...selected]
    if (!ids.length) return
    const ok = await prompt({
      title: `Dismiss ${ids.length} candidate${ids.length > 1 ? "s" : ""}?`,
      description: "Marks them as 'ages well' and removes them from this list.",
      confirmText: "Dismiss",
      cancelText: "Cancel",
    })
    if (!ok) return
    setActioning(true)
    try {
      for (const id of ids) {
        await sdk.client.fetch(`/admin/aging-candidates/${id}/dismiss`, {
          method: "POST",
          body: { reason: "Ages well" },
        })
      }
      toast.success(`Dismissed ${ids.length}`)
      setSelected(new Set())
      load()
    } catch (e: any) {
      toast.error(e?.message || "Dismiss failed")
    } finally {
      setActioning(false)
    }
  }

  return (
    <div>
      <Text size="small" className="text-ui-fg-subtle mb-4 block">
        Beers packaged more than 60 days ago. Mark down to clear stock, or dismiss if it ages well.
      </Text>

      {selected.size > 0 && (
        <div className="flex items-center justify-between px-3 py-2 mb-3 bg-ui-bg-subtle border border-ui-border-base rounded-md">
          <Text size="small" weight="plus">
            {selected.size} selected
          </Text>
          <div className="flex items-center gap-2">
            <Select value={discountType} onValueChange={setDiscountType}>
              <Select.Trigger className="w-28">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="percentage">%</Select.Item>
                <Select.Item value="fixed">$</Select.Item>
              </Select.Content>
            </Select>
            <Input
              type="number"
              className="w-20"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
            <Button size="small" isLoading={actioning} onClick={bulkMarkdown}>
              Mark down {selected.size}
            </Button>
            <Button size="small" variant="secondary" disabled={actioning} onClick={bulkDismiss}>
              Dismiss {selected.size}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <Text className="text-ui-fg-muted">Loading…</Text>
      ) : candidates.length === 0 ? (
        <Text className="text-ui-fg-muted">No aging candidates pending review.</Text>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell className="w-10" />
              <Table.HeaderCell>Product</Table.HeaderCell>
              <Table.HeaderCell>Packaged</Table.HeaderCell>
              <Table.HeaderCell>Days aged</Table.HeaderCell>
              <Table.HeaderCell>Suggested</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {candidates.map((c) => (
              <Table.Row key={c.id}>
                <Table.Cell onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                </Table.Cell>
                <Table.Cell className="font-medium">{c.product_title || c.product_id}</Table.Cell>
                <Table.Cell className="text-sm">{fmtDate(c.packaged_date)}</Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={c.days_aged > 90 ? "red" : "orange"}>
                    {c.days_aged}d
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="text-ui-fg-subtle">
                    {suggestedMarkdown(c.days_aged)}% off
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  )
}

type SpecialsBatch = {
  id: string
  label: string | null
  status: "sending" | "sent" | "failed"
  campaign_count: number
  recipient_count: number
  sent_count: number
  failed_count: number
  sent_at: string | null
  created_at: string
}

type PickedCustomer = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
}

const VIP_TIERS = ["approved", "vip1", "vip2", "vip3", "vip4", "vip5"]

function customerLabel(c: PickedCustomer) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ")
  return name ? `${name} (${c.email})` : c.email
}

function batchStatusBadge(status: SpecialsBatch["status"]) {
  if (status === "sent") return <Badge color="green">Sent</Badge>
  if (status === "sending") return <Badge color="orange">Sending</Badge>
  return <Badge color="red">Failed</Badge>
}

function SendBatchTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [batches, setBatches] = useState<SpecialsBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [targetingMode, setTargetingMode] = useState<"filters" | "customers">("filters")
  const [vipTierMin, setVipTierMin] = useState("")
  const [selectedCustomers, setSelectedCustomers] = useState<PickedCustomer[]>([])
  const [q, setQ] = useState("")
  const [results, setResults] = useState<PickedCustomer[]>([])
  const [searching, setSearching] = useState(false)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [sending, setSending] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [campaignData, batchData] = await Promise.all([
        sdk.client.fetch<{ campaigns: Campaign[] }>("/admin/specials"),
        sdk.client.fetch<{ batches: SpecialsBatch[] }>("/admin/specials-batches"),
      ])
      setCampaigns(campaignData.campaigns || [])
      setBatches(batchData.batches || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

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

  const eligible = campaigns.filter(
    (c) => ["active", "scheduled"].includes(c.status) && !c.batch_id
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
    setPreviewCount(null)
  }

  const segmentFilter = () => {
    if (targetingMode === "customers") {
      return { mode: "customers" as const, customer_ids: selectedCustomers.map((c) => c.id) }
    }
    const filter: Record<string, any> = { category_optin: "specials" }
    if (vipTierMin) filter.vip_tier_min = vipTierMin
    return filter
  }

  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const res = await sdk.client.fetch<{ recipientCount: number }>(
        "/admin/specials-batches/preview",
        { method: "POST", body: { campaign_ids: [...selected], segment_filter: segmentFilter() } }
      )
      setPreviewCount(res.recipientCount)
    } catch (e: any) {
      toast.error(e?.message || "Preview failed")
    } finally {
      setPreviewing(false)
    }
  }

  const handleSend = async () => {
    setSending(true)
    try {
      await sdk.client.fetch("/admin/specials-batches", {
        method: "POST",
        body: { campaign_ids: [...selected], segment_filter: segmentFilter() },
      })
      toast.success("Batch sent")
      setSelected(new Set())
      setPreviewCount(null)
      load()
    } catch (e: any) {
      toast.error(e?.message || "Send failed")
    } finally {
      setSending(false)
    }
  }

  const retryBatch = async (id: string) => {
    try {
      await sdk.client.fetch(`/admin/specials-batches/${id}`, {
        method: "POST",
        body: { action: "retry-failed" },
      })
      toast.success("Retrying failed deliveries")
      load()
    } catch (e: any) {
      toast.error(e?.message || "Retry failed")
    }
  }

  if (loading) return <Text className="text-ui-fg-muted">Loading…</Text>

  return (
    <div className="space-y-8">
      <div>
        <Text weight="plus" className="mb-2 block">
          1. Select campaigns to notify about
        </Text>
        {eligible.length === 0 ? (
          <Text className="text-ui-fg-muted">
            No active or scheduled campaigns available (already-batched campaigns are excluded).
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-10" />
                <Table.HeaderCell>Title</Table.HeaderCell>
                <Table.HeaderCell>Discount</Table.HeaderCell>
                <Table.HeaderCell>Products</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {eligible.map((c) => (
                <Table.Row key={c.id}>
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                  </Table.Cell>
                  <Table.Cell className="font-medium">{c.title}</Table.Cell>
                  <Table.Cell>
                    {c.discount_value}
                    {c.discount_type === "percentage" ? "%" : " AUD"} off
                  </Table.Cell>
                  <Table.Cell>{c.target_product_ids?.length || 0}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      <div>
        <Text weight="plus" className="mb-2 block">
          2. Who should receive it
        </Text>
        <div className="flex gap-2 mb-3">
          <Button
            size="small"
            variant={targetingMode === "filters" ? "primary" : "secondary"}
            onClick={() => {
              setTargetingMode("filters")
              setPreviewCount(null)
            }}
          >
            Segment
          </Button>
          <Button
            size="small"
            variant={targetingMode === "customers" ? "primary" : "secondary"}
            onClick={() => {
              setTargetingMode("customers")
              setPreviewCount(null)
            }}
          >
            Specific customers
          </Button>
        </div>
        {targetingMode === "filters" ? (
          <div className="space-y-1 max-w-xs">
            <Label size="small" weight="plus">
              Minimum VIP tier (optional)
            </Label>
            <Select
              value={vipTierMin}
              onValueChange={(v) => {
                setVipTierMin(v)
                setPreviewCount(null)
              }}
            >
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
            <Text size="small" className="text-ui-fg-muted">
              Sends to every customer opted into Specials &amp; Price Drops (optionally narrowed to
              a VIP tier and above).
            </Text>
          </div>
        ) : (
          <div className="space-y-2 max-w-md">
            {selectedCustomers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedCustomers.map((c) => (
                  <span
                    key={c.id}
                    className="flex items-center gap-1.5 bg-ui-bg-subtle border border-ui-border-base rounded-md pl-2 pr-2 py-1 text-sm"
                  >
                    {customerLabel(c)}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomers(selectedCustomers.filter((x) => x.id !== c.id))
                        setPreviewCount(null)
                      }}
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
                  const added = !!selectedCustomers.find((x) => x.id === c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={added}
                      onClick={() => {
                        if (!added) setSelectedCustomers([...selectedCustomers, c])
                        setPreviewCount(null)
                      }}
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
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="small"
          variant="secondary"
          onClick={handlePreview}
          isLoading={previewing}
          disabled={selected.size === 0}
        >
          Preview recipients
        </Button>
        {previewCount !== null && (
          <Text size="small" className="text-ui-fg-subtle">
            {previewCount} recipient{previewCount === 1 ? "" : "s"}
          </Text>
        )}
        <Button
          size="small"
          onClick={handleSend}
          isLoading={sending}
          disabled={selected.size === 0}
        >
          Send batch
        </Button>
      </div>

      <div>
        <Text weight="plus" className="mb-2 block">
          Batch history
        </Text>
        {batches.length === 0 ? (
          <Text className="text-ui-fg-muted">No specials batches sent yet.</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Label</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Campaigns</Table.HeaderCell>
                <Table.HeaderCell>Recipients</Table.HeaderCell>
                <Table.HeaderCell>Sent / Failed</Table.HeaderCell>
                <Table.HeaderCell>Sent at</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {batches.map((b) => (
                <Table.Row key={b.id}>
                  <Table.Cell>{b.label || "—"}</Table.Cell>
                  <Table.Cell>{batchStatusBadge(b.status)}</Table.Cell>
                  <Table.Cell>{b.campaign_count}</Table.Cell>
                  <Table.Cell>{b.recipient_count}</Table.Cell>
                  <Table.Cell>
                    {b.sent_count} / {b.failed_count}
                  </Table.Cell>
                  <Table.Cell className="text-xs text-ui-fg-subtle">
                    {fmtDate(b.sent_at)}
                  </Table.Cell>
                  <Table.Cell>
                    {b.status === "failed" && (
                      <Button size="small" variant="secondary" onClick={() => retryBatch(b.id)}>
                        Retry failed
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </div>
  )
}

const CampaignsPage = () => {
  return (
    <Container>
      <Heading level="h1" className="mb-4">
        Campaigns &amp; Specials
      </Heading>
      <Tabs defaultValue="campaigns">
        <Tabs.List>
          <Tabs.Trigger value="campaigns">Campaigns</Tabs.Trigger>
          <Tabs.Trigger value="aging">Aging candidates</Tabs.Trigger>
          <Tabs.Trigger value="send-batch">Send Batch</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="campaigns" className="pt-4">
          <CampaignsTab />
        </Tabs.Content>
        <Tabs.Content value="aging" className="pt-4">
          <AgingTab />
        </Tabs.Content>
        <Tabs.Content value="send-batch" className="pt-4">
          <SendBatchTab />
        </Tabs.Content>
      </Tabs>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Campaigns",
})

export default CampaignsPage
