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
  Switch,
  Badge,
  Text,
  Select,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type Announcement = {
  id: string
  message: string
  link_text: string | null
  link_url: string | null
  type: "info" | "warning" | "promo"
  is_active: boolean
  priority: number
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

type FormState = {
  message: string
  link_text: string
  link_url: string
  type: "info" | "warning" | "promo"
  is_active: boolean
  priority: string
  starts_at: string
  ends_at: string
}

const EMPTY_FORM: FormState = {
  message: "",
  link_text: "",
  link_url: "",
  type: "info",
  is_active: true,
  priority: "0",
  starts_at: "",
  ends_at: "",
}

function typeLabel(type: string) {
  if (type === "promo") return <Badge color="orange">Promo</Badge>
  if (type === "warning") return <Badge color="red">Warning</Badge>
  return <Badge color="blue">Info</Badge>
}

function BannerForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState
  onSave: (f: FormState) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormState>(initial)
  const set = (field: keyof FormState, value: any) => setForm((f) => ({ ...f, [field]: value }))

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <Label htmlFor="message" className="mb-1 block">
          Message *
        </Label>
        <Textarea
          id="message"
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Happy Valentine's Day! Save 20% with code LOVE20"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="link_text" className="mb-1 block">
            Link label
          </Label>
          <Input
            id="link_text"
            value={form.link_text}
            onChange={(e) => set("link_text", e.target.value)}
            placeholder="Shop now"
          />
        </div>
        <div>
          <Label htmlFor="link_url" className="mb-1 block">
            Link URL
          </Label>
          <Input
            id="link_url"
            value={form.link_url}
            onChange={(e) => set("link_url", e.target.value)}
            placeholder="/store?filter=new"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="mb-1 block">Type</Label>
          <Select value={form.type} onValueChange={(v: any) => set("type", v)}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="promo">Promo (gold)</Select.Item>
              <Select.Item value="info">Info (teal)</Select.Item>
              <Select.Item value="warning">Warning (red)</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority" className="mb-1 block">
            Priority
          </Label>
          <Input
            id="priority"
            type="number"
            value={form.priority}
            onChange={(e) => set("priority", e.target.value)}
            placeholder="0"
          />
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Higher = shown first. Leave 0 for normal order.
          </Text>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="starts_at" className="mb-1 block">
            Starts at (optional)
          </Label>
          <Input
            id="starts_at"
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => set("starts_at", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ends_at" className="mb-1 block">
            Ends at (optional)
          </Label>
          <Input
            id="ends_at"
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => set("ends_at", e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="is_active"
          checked={form.is_active}
          onCheckedChange={(v) => set("is_active", v)}
        />
        <Label htmlFor="is_active">Active (visible on site)</Label>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-ui-border-base">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={() => onSave(form)}
          disabled={saving || !form.message.trim()}
          isLoading={saving}
        >
          Save banner
        </Button>
      </div>
    </div>
  )
}

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [saving, setSaving] = useState(false)
  const prompt = usePrompt()

  const load = async () => {
    setLoading(true)
    try {
      const res = await sdk.client.fetch<{ announcements: Announcement[] }>(
        "/admin/announcements",
        { method: "GET" }
      )
      setAnnouncements(res.announcements ?? [])
    } catch {
      toast.error("Failed to load banners")
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

  const openEdit = (a: Announcement) => {
    setEditing(a)
    setModalOpen(true)
  }

  const handleSave = async (form: FormState) => {
    setSaving(true)
    try {
      const payload = {
        message: form.message.trim(),
        link_text: form.link_text.trim() || null,
        link_url: form.link_url.trim() || null,
        type: form.type,
        is_active: form.is_active,
        priority: parseInt(form.priority, 10) || 0,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      }
      if (editing) {
        await sdk.client.fetch(`/admin/announcements/${editing.id}`, {
          method: "POST",
          body: payload,
        })
        toast.success("Banner updated")
      } else {
        await sdk.client.fetch("/admin/announcements", {
          method: "POST",
          body: payload,
        })
        toast.success("Banner created")
      }
      setModalOpen(false)
      load()
    } catch {
      toast.error("Failed to save banner")
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (a: Announcement) => {
    try {
      await sdk.client.fetch(`/admin/announcements/${a.id}`, {
        method: "POST",
        body: { is_active: !a.is_active },
      })
      setAnnouncements((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, is_active: !x.is_active } : x))
      )
    } catch {
      toast.error("Failed to update banner")
    }
  }

  const handleDelete = async (a: Announcement) => {
    const confirmed = await prompt({
      title: "Delete banner",
      description: `Remove "${a.message.slice(0, 60)}${a.message.length > 60 ? "…" : ""}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    try {
      await sdk.client.fetch(`/admin/announcements/${a.id}`, { method: "DELETE" })
      toast.success("Banner deleted")
      load()
    } catch {
      toast.error("Failed to delete banner")
    }
  }

  const initialForm = (a: Announcement | null): FormState => {
    if (!a) return EMPTY_FORM
    return {
      message: a.message,
      link_text: a.link_text ?? "",
      link_url: a.link_url ?? "",
      type: a.type,
      is_active: a.is_active,
      priority: String(a.priority ?? 0),
      starts_at: a.starts_at ? a.starts_at.slice(0, 16) : "",
      ends_at: a.ends_at ? a.ends_at.slice(0, 16) : "",
    }
  }

  const sorted = [...announcements].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

  return (
    <>
      <Container>
        <div className="flex items-center justify-between mb-4">
          <Heading level="h1">Site Banners</Heading>
          <Button onClick={openCreate} size="small">
            + New Banner
          </Button>
        </div>

        {loading ? (
          <Text className="text-ui-fg-subtle">Loading…</Text>
        ) : sorted.length === 0 ? (
          <Text className="text-ui-fg-subtle">
            No banners yet. Create one to show it at the top of every page.
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Priority</Table.HeaderCell>
                <Table.HeaderCell>Message</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>Link</Table.HeaderCell>
                <Table.HeaderCell>Schedule</Table.HeaderCell>
                <Table.HeaderCell>Active</Table.HeaderCell>
                <Table.HeaderCell></Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sorted.map((a) => (
                <Table.Row key={a.id} className="cursor-pointer" onClick={() => openEdit(a)}>
                  <Table.Cell>
                    <Badge color={a.priority > 0 ? "green" : "grey"}>{a.priority ?? 0}</Badge>
                  </Table.Cell>
                  <Table.Cell className="max-w-xs">
                    <Text className="truncate">{a.message}</Text>
                  </Table.Cell>
                  <Table.Cell>{typeLabel(a.type)}</Table.Cell>
                  <Table.Cell>
                    {a.link_url ? (
                      <Text size="small" className="text-ui-fg-interactive truncate max-w-[120px]">
                        {a.link_text || a.link_url}
                      </Text>
                    ) : (
                      <Text size="small" className="text-ui-fg-subtle">
                        —
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {a.starts_at || a.ends_at ? (
                      <Text size="small" className="text-ui-fg-subtle whitespace-nowrap">
                        {a.starts_at ? new Date(a.starts_at).toLocaleDateString() : "—"} →{" "}
                        {a.ends_at ? new Date(a.ends_at).toLocaleDateString() : "∞"}
                      </Text>
                    ) : (
                      <Text size="small" className="text-ui-fg-subtle">
                        Always
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    <Switch checked={a.is_active} onCheckedChange={() => handleToggle(a)} />
                  </Table.Cell>
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    <Button variant="danger" size="small" onClick={() => handleDelete(a)}>
                      Delete
                    </Button>
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
            <Heading>{editing ? "Edit banner" : "New banner"}</Heading>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-auto">
            <BannerForm
              initial={initialForm(editing)}
              onSave={handleSave}
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
  label: "Banners",
})

export default AnnouncementsPage
