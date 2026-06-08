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
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useEffect, useState, useRef } from "react"
import { sdk } from "../../lib/sdk"

type Brewery = {
  id: string
  name: string
  slug: string
  description: string | null
  location: string | null
  logo_url: string | null
  hero_image_url: string | null
  website_url: string | null
  untappd_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  is_active: boolean
  product_count: number
}

type FormState = {
  name: string
  slug: string
  slugTouched: boolean
  location: string
  description: string
  logo_url: string
  hero_image_url: string
  website_url: string
  instagram_url: string
  untappd_url: string
  is_active: boolean
}

const EMPTY: FormState = {
  name: "",
  slug: "",
  slugTouched: false,
  location: "",
  description: "",
  logo_url: "",
  hero_image_url: "",
  website_url: "",
  instagram_url: "",
  untappd_url: "",
  is_active: true,
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

function ImageUpload({
  label,
  hint,
  variant = "wide",
  currentUrl,
  onUploaded,
}: {
  label: string
  hint?: string
  variant?: "wide" | "square"
  currentUrl: string | null
  onUploaded: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setPreview(currentUrl), [currentUrl])

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const data = await sdk.admin.upload.create({ files: [file] })
      const url = (data as any).files?.[0]?.url
      if (url) {
        setPreview(url)
        onUploaded(url)
      } else throw new Error("No URL")
    } catch {
      toast.error("Image upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label size="small" weight="plus">
          {label}
        </Label>
        {hint && (
          <Text size="small" className="text-ui-fg-muted">
            {hint}
          </Text>
        )}
      </div>
      <div
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-3 border border-ui-border-base rounded-lg p-3 cursor-pointer hover:border-ui-fg-interactive transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
        {preview ? (
          <img
            src={preview}
            alt=""
            className={`object-cover rounded ${variant === "square" ? "w-14 h-14" : "w-24 h-14"}`}
          />
        ) : (
          <div
            className={`rounded bg-ui-bg-subtle ${variant === "square" ? "w-14 h-14" : "w-24 h-14"}`}
          />
        )}
        <Text size="small" className="text-ui-fg-muted flex-1">
          {uploading ? "Uploading…" : preview ? "Click to replace" : "Click to upload"}
        </Text>
        {preview && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setPreview(null)
              onUploaded("")
            }}
            className="text-ui-fg-muted hover:text-ui-fg-base text-xs"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

function BreweryFields({
  form,
  set,
  slugTaken,
  showActive,
}: {
  form: FormState
  set: (patch: Partial<FormState>) => void
  slugTaken: boolean
  showActive: boolean
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
      {/* LEFT — Details */}
      <div className="space-y-4">
        <Text size="small" weight="plus" className="text-ui-fg-muted uppercase tracking-wide">
          Details
        </Text>

        <div className="space-y-1">
          <Label size="small" weight="plus">
            Name
          </Label>
          <Input
            value={form.name}
            onChange={(e) =>
              set({
                name: e.target.value,
                ...(form.slugTouched ? {} : { slug: slugify(e.target.value) }),
              })
            }
            placeholder="Mountain Culture Beer Co"
          />
        </div>

        <div className="space-y-1">
          <Label size="small" weight="plus">
            Slug
          </Label>
          <Input
            value={form.slug}
            onChange={(e) => set({ slug: slugify(e.target.value), slugTouched: true })}
            placeholder="mountain-culture-beer-co"
          />
          {form.slug ? (
            slugTaken ? (
              <Text size="small" className="text-ui-fg-error">
                Slug already in use
              </Text>
            ) : (
              <Text size="small" className="text-ui-tag-green-text">
                Slug available
              </Text>
            )
          ) : (
            <Text size="small" className="text-ui-fg-muted">
              Auto-generated from name
            </Text>
          )}
        </div>

        <div className="space-y-1">
          <Label size="small" weight="plus">
            Location
          </Label>
          <Input
            value={form.location}
            onChange={(e) => set({ location: e.target.value })}
            placeholder="Katoomba, NSW"
          />
        </div>

        <div className="space-y-1">
          <Label size="small" weight="plus">
            Description
          </Label>
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Short blurb shown on the brewery page."
          />
        </div>

        {showActive && (
          <div className="flex items-center justify-between rounded-lg border border-ui-border-base p-3">
            <div>
              <Label size="small" weight="plus">
                Active
              </Label>
              <Text size="small" className="text-ui-fg-muted">
                Inactive breweries are hidden from the storefront.
              </Text>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => set({ is_active: v })} />
          </div>
        )}
      </div>

      {/* RIGHT — Media & links */}
      <div className="space-y-4">
        <Text size="small" weight="plus" className="text-ui-fg-muted uppercase tracking-wide">
          Media &amp; links
        </Text>

        <ImageUpload
          label="Logo"
          hint="Square"
          variant="square"
          currentUrl={form.logo_url || null}
          onUploaded={(url) => set({ logo_url: url })}
        />
        <ImageUpload
          label="Hero image"
          hint="Wide banner"
          currentUrl={form.hero_image_url || null}
          onUploaded={(url) => set({ hero_image_url: url })}
        />

        <div className="space-y-1">
          <Label size="small" weight="plus">
            Website
          </Label>
          <Input
            value={form.website_url}
            onChange={(e) => set({ website_url: e.target.value })}
            placeholder="https://"
          />
        </div>
        <div className="space-y-1">
          <Label size="small" weight="plus">
            Instagram
          </Label>
          <Input
            value={form.instagram_url}
            onChange={(e) => set({ instagram_url: e.target.value })}
            placeholder="https://instagram.com/…"
          />
        </div>
        <div className="space-y-1">
          <Label size="small" weight="plus">
            Untappd
          </Label>
          <Input
            value={form.untappd_url}
            onChange={(e) => set({ untappd_url: e.target.value })}
            placeholder="https://untappd.com/…"
          />
        </div>
      </div>
    </div>
  )
}

const BreweriesPage = () => {
  const [breweries, setBreweries] = useState<Brewery[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"create" | "edit" | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const prompt = usePrompt()

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const load = () => {
    setLoading(true)
    sdk.client
      .fetch<{ breweries: Brewery[] }>("/admin/breweries")
      .then((d) => setBreweries(d.breweries || []))
      .catch(() => toast.error("Failed to load breweries"))
      .finally(() => setLoading(false))
  }
  useEffect(() => load(), [])

  const slugTaken = breweries.some((b) => b.slug === form.slug && b.id !== editingId)

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    setMode("create")
  }
  const openEdit = (b: Brewery) => {
    setForm({
      name: b.name,
      slug: b.slug,
      slugTouched: true,
      location: b.location || "",
      description: b.description || "",
      logo_url: b.logo_url || "",
      hero_image_url: b.hero_image_url || "",
      website_url: b.website_url || "",
      instagram_url: b.instagram_url || "",
      untappd_url: b.untappd_url || "",
      is_active: b.is_active,
    })
    setEditingId(b.id)
    setMode("edit")
  }
  const close = () => {
    setMode(null)
    setEditingId(null)
  }

  const payload = () => {
    const p: Record<string, any> = { name: form.name, slug: form.slug }
    if (form.location) p.location = form.location
    if (form.description) p.description = form.description
    if (form.logo_url) p.logo_url = form.logo_url
    if (form.hero_image_url) p.hero_image_url = form.hero_image_url
    if (form.website_url) p.website_url = form.website_url
    if (form.instagram_url) p.instagram_url = form.instagram_url
    if (form.untappd_url) p.untappd_url = form.untappd_url
    return p
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Name and slug are required")
      return
    }
    if (slugTaken) {
      toast.error("Slug already in use")
      return
    }
    setSaving(true)
    try {
      if (mode === "create") {
        await sdk.client.fetch("/admin/breweries", { method: "POST", body: payload() })
        toast.success("Brewery created")
      } else if (editingId) {
        await sdk.client.fetch(`/admin/breweries/${editingId}`, {
          method: "POST",
          body: { ...payload(), is_active: form.is_active },
        })
        toast.success("Brewery updated")
      }
      close()
      load()
    } catch (e: any) {
      toast.error(e?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (b: Brewery) => {
    setTogglingId(b.id)
    try {
      await sdk.client.fetch(`/admin/breweries/${b.id}`, {
        method: "POST",
        body: { is_active: !b.is_active },
      })
      setBreweries((prev) =>
        prev.map((x) => (x.id === b.id ? { ...x, is_active: !b.is_active } : x))
      )
    } catch {
      toast.error("Could not update status")
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (b: Brewery) => {
    const ok = await prompt({
      title: `Delete ${b.name}?`,
      description: "This removes the brewery. Products linked to it will lose the association.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    })
    if (!ok) return
    try {
      await sdk.client.fetch(`/admin/breweries/${b.id}`, { method: "DELETE" })
      toast.success("Brewery deleted")
      load()
    } catch (e: any) {
      toast.error(e?.message || "Delete failed")
    }
  }

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Breweries</Heading>
        <Button size="small" onClick={openCreate}>
          Add brewery
        </Button>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-subtle">Loading…</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-12">Logo</Table.HeaderCell>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Location</Table.HeaderCell>
                <Table.HeaderCell>Beers</Table.HeaderCell>
                <Table.HeaderCell>Active</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {breweries.map((b) => (
                <Table.Row key={b.id} className="cursor-pointer" onClick={() => openEdit(b)}>
                  <Table.Cell>
                    {b.logo_url ? (
                      <img src={b.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-ui-bg-subtle" />
                    )}
                  </Table.Cell>
                  <Table.Cell className="font-medium">{b.name}</Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle">{b.location || "—"}</Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" color={b.product_count ? "blue" : "grey"}>
                      {b.product_count} {b.product_count === 1 ? "beer" : "beers"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={b.is_active}
                      disabled={togglingId === b.id}
                      onCheckedChange={() => toggleActive(b)}
                    />
                  </Table.Cell>
                  <Table.Cell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="small" onClick={() => openEdit(b)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="small" onClick={() => handleDelete(b)}>
                        Delete
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
              {breweries.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={6}>
                    <div className="text-center text-ui-fg-subtle py-8">No breweries yet.</div>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        )}
      </div>

      {/* Single full-screen modal for both create and edit */}
      <FocusModal open={mode !== null} onOpenChange={(o) => !o && close()}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Text weight="plus">{mode === "create" ? "New brewery" : "Edit brewery"}</Text>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="small" onClick={close} disabled={saving}>
                Cancel
              </Button>
              <Button
                size="small"
                onClick={handleSave}
                isLoading={saving}
                disabled={!form.name.trim() || !form.slug.trim() || slugTaken}
              >
                {mode === "create" ? "Create brewery" : "Save changes"}
              </Button>
            </div>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <BreweryFields
                form={form}
                set={set}
                slugTaken={slugTaken}
                showActive={mode === "edit"}
              />
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Breweries",
})

export default BreweriesPage
