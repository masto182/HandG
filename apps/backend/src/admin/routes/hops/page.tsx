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
import { useEffect, useState, useRef } from "react"
import { sdk } from "../../lib/sdk"

type Hop = {
  id: string
  name: string
  slug: string
  origin: string | null
  country_code: string | null
  breeder: string | null
  available_forms: string[] | null
  farm_notes: string | null
  flavor_profile: string | null
  description: string | null
  image_url: string | null
  is_active: boolean
  product_count: number
}

type FormState = {
  name: string
  slug: string
  slugTouched: boolean
  origin: string
  country_code: string
  breeder: string
  available_forms: string
  farm_notes: string
  flavor_profile: string
  description: string
  image_url: string
  is_active: boolean
}

const COUNTRY_OPTIONS = [
  { value: "", label: "Select country" },
  { value: "NZ", label: "New Zealand" },
  { value: "AU", label: "Australia" },
  { value: "US", label: "United States" },
  { value: "EU", label: "Europe" },
  { value: "Other", label: "Other" },
]

const KNOWN_FORMS = [
  "T90",
  "Cryo",
  "CGX",
  "Incognito",
  "Spectrum",
  "HyperBoost",
  "DynaBoost",
  "SubZeroHopKief",
  "HopKief",
  "LiquidLupulin",
  "WholeCone",
]

const EMPTY: FormState = {
  name: "",
  slug: "",
  slugTouched: false,
  origin: "",
  country_code: "",
  breeder: "",
  available_forms: "",
  farm_notes: "",
  flavor_profile: "",
  description: "",
  image_url: "",
  is_active: true,
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

/** Parses a comma-separated flavor string into trimmed tokens, ignoring empty parts. */
const parseFlavorTokens = (s: string): string[] =>
  s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

// ---------------------------------------------------------------------------
// ImageUpload — single square image via sdk.admin.upload.create
// ---------------------------------------------------------------------------
function ImageUpload({
  currentUrl,
  onUploaded,
}: {
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
      } else {
        throw new Error("No URL returned")
      }
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
          Image
        </Label>
        <Text size="small" className="text-ui-fg-muted">
          Square, min 400×400
        </Text>
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
          <img src={preview} alt="" className="w-14 h-14 object-cover rounded" />
        ) : (
          <div className="w-14 h-14 rounded bg-ui-bg-subtle flex items-center justify-center">
            <svg
              className="w-6 h-6 text-ui-fg-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
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

// ---------------------------------------------------------------------------
// HopFields — two-column form inside FocusModal
// ---------------------------------------------------------------------------
function HopFields({
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
  const flavorTokens = parseFlavorTokens(form.flavor_profile)

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
            placeholder="Citra"
          />
        </div>

        <div className="space-y-1">
          <Label size="small" weight="plus">
            Slug
          </Label>
          <Input
            value={form.slug}
            onChange={(e) => set({ slug: slugify(e.target.value), slugTouched: true })}
            placeholder="citra"
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
            Origin
          </Label>
          <Input
            value={form.origin}
            onChange={(e) => set({ origin: e.target.value })}
            placeholder="USA – Yakima Valley"
          />
        </div>

        <div className="space-y-1">
          <Label size="small" weight="plus">
            Country
          </Label>
          <Select value={form.country_code} onValueChange={(v) => set({ country_code: v })}>
            <Select.Trigger>
              <Select.Value placeholder="Select country" />
            </Select.Trigger>
            <Select.Content>
              {COUNTRY_OPTIONS.filter((o) => o.value).map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        <div className="space-y-1">
          <Label size="small" weight="plus">
            Breeder / IP owner
          </Label>
          <Input
            value={form.breeder}
            onChange={(e) => set({ breeder: e.target.value })}
            placeholder="NZ Hops Ltd"
          />
        </div>

        <div className="space-y-1">
          <Label size="small" weight="plus">
            Available forms
          </Label>
          <Input
            value={form.available_forms}
            onChange={(e) => set({ available_forms: e.target.value })}
            placeholder="T90, Cryo, SubZeroHopKief"
          />
          <Text size="small" className="text-ui-fg-muted">
            Comma-separated. Known: {KNOWN_FORMS.join(", ")}
          </Text>
          {parseFlavorTokens(form.available_forms).length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {parseFlavorTokens(form.available_forms).map((t) => (
                <Badge key={t} size="2xsmall" color="blue">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label size="small" weight="plus">
            Farm &amp; sourcing notes
          </Label>
          <Textarea
            rows={3}
            value={form.farm_notes}
            onChange={(e) => set({ farm_notes: e.target.value })}
            placeholder="Key farms, lot designations, suppliers..."
          />
        </div>

        <div className="space-y-1">
          <Label size="small" weight="plus">
            Flavor profile
          </Label>
          <Input
            value={form.flavor_profile}
            onChange={(e) => set({ flavor_profile: e.target.value })}
            placeholder="Tropical, citrus, grapefruit, passionfruit"
          />
          <Text size="small" className="text-ui-fg-muted">
            Comma-separated. Shown as pills on the storefront.
          </Text>
          {flavorTokens.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {flavorTokens.map((t) => (
                <Badge key={t} size="2xsmall" color="green">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label size="small" weight="plus">
            Description
          </Label>
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Short description shown on the hop page."
          />
        </div>

        {showActive && (
          <div className="flex items-center justify-between rounded-lg border border-ui-border-base p-3">
            <div>
              <Label size="small" weight="plus">
                Active
              </Label>
              <Text size="small" className="text-ui-fg-muted">
                Inactive hops are hidden from the storefront.
              </Text>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => set({ is_active: v })} />
          </div>
        )}
      </div>

      {/* RIGHT — Image */}
      <div className="space-y-4">
        <Text size="small" weight="plus" className="text-ui-fg-muted uppercase tracking-wide">
          Media
        </Text>
        <ImageUpload
          currentUrl={form.image_url || null}
          onUploaded={(url) => set({ image_url: url })}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HopsPage
// ---------------------------------------------------------------------------
const HopsPage = () => {
  const [hops, setHops] = useState<Hop[]>([])
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
      .fetch<{ hops: Hop[] }>("/admin/hops")
      .then((d) => setHops(d.hops || []))
      .catch(() => toast.error("Failed to load hops"))
      .finally(() => setLoading(false))
  }
  useEffect(() => load(), [])

  const slugTaken = hops.some((h) => h.slug === form.slug && h.id !== editingId)

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    setMode("create")
  }

  const openEdit = (h: Hop) => {
    setForm({
      name: h.name,
      slug: h.slug,
      slugTouched: true,
      origin: h.origin || "",
      country_code: h.country_code || "",
      breeder: h.breeder || "",
      available_forms: Array.isArray(h.available_forms)
        ? (h.available_forms as string[]).join(", ")
        : h.available_forms || "",
      farm_notes: h.farm_notes || "",
      flavor_profile: h.flavor_profile || "",
      description: h.description || "",
      image_url: h.image_url || "",
      is_active: h.is_active,
    })
    setEditingId(h.id)
    setMode("edit")
  }

  const close = () => {
    setMode(null)
    setEditingId(null)
  }

  const buildPayload = () => {
    const p: Record<string, unknown> = {
      name: form.name,
      slug: form.slug,
    }
    if (form.origin) p.origin = form.origin
    if (form.country_code) p.country_code = form.country_code
    if (form.breeder) p.breeder = form.breeder
    p.available_forms = form.available_forms
      ? form.available_forms
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []
    if (form.farm_notes) p.farm_notes = form.farm_notes
    if (form.flavor_profile) p.flavor_profile = form.flavor_profile
    if (form.description) p.description = form.description
    if (form.image_url) p.image_url = form.image_url
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
        await sdk.client.fetch("/admin/hops", {
          method: "POST",
          body: buildPayload(),
        })
        toast.success("Hop created")
      } else if (editingId) {
        await sdk.client.fetch(`/admin/hops/${editingId}`, {
          method: "POST",
          body: { ...buildPayload(), is_active: form.is_active },
        })
        toast.success("Hop updated")
      }
      close()
      load()
    } catch (e: unknown) {
      toast.error((e as any)?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (h: Hop) => {
    setTogglingId(h.id)
    try {
      await sdk.client.fetch(`/admin/hops/${h.id}`, {
        method: "POST",
        body: { is_active: !h.is_active },
      })
      setHops((prev) => prev.map((x) => (x.id === h.id ? { ...x, is_active: !h.is_active } : x)))
    } catch {
      toast.error("Could not update status")
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (h: Hop) => {
    const ok = await prompt({
      title: `Deactivate ${h.name}?`,
      description:
        "This hop will be hidden from the storefront and cannot be linked to new releases. You can reactivate it at any time.",
      confirmText: "Deactivate",
      cancelText: "Cancel",
      variant: "danger",
    })
    if (!ok) return
    try {
      await sdk.client.fetch(`/admin/hops/${h.id}`, { method: "DELETE" })
      setHops((prev) => prev.map((x) => (x.id === h.id ? { ...x, is_active: false } : x)))
      toast.success(`${h.name} deactivated`)
    } catch (e: unknown) {
      toast.error((e as any)?.message || "Deactivate failed")
    }
  }

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Hops</Heading>
        <Button size="small" onClick={openCreate}>
          Add hop
        </Button>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-subtle">Loading…</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-12" />
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Origin</Table.HeaderCell>
                <Table.HeaderCell>Flavor profile</Table.HeaderCell>
                <Table.HeaderCell>Releases</Table.HeaderCell>
                <Table.HeaderCell>Active</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {hops.map((h) => {
                const flavorTokens = parseFlavorTokens(h.flavor_profile || "")
                return (
                  <Table.Row key={h.id} className="cursor-pointer" onClick={() => openEdit(h)}>
                    {/* Thumbnail */}
                    <Table.Cell>
                      {h.image_url ? (
                        <img src={h.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-ui-bg-subtle flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-ui-fg-muted"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                            />
                          </svg>
                        </div>
                      )}
                    </Table.Cell>

                    {/* Name */}
                    <Table.Cell className="font-medium">{h.name}</Table.Cell>

                    {/* Origin */}
                    <Table.Cell className="text-ui-fg-subtle">{h.origin || "—"}</Table.Cell>

                    {/* Flavor profile — first 3 pills */}
                    <Table.Cell>
                      <div className="flex flex-wrap gap-1">
                        {flavorTokens.slice(0, 3).map((t) => (
                          <Badge key={t} size="2xsmall" color="green">
                            {t}
                          </Badge>
                        ))}
                        {flavorTokens.length > 3 && (
                          <Badge size="2xsmall" color="grey">
                            +{flavorTokens.length - 3}
                          </Badge>
                        )}
                        {flavorTokens.length === 0 && (
                          <Text size="small" className="text-ui-fg-muted">
                            —
                          </Text>
                        )}
                      </div>
                    </Table.Cell>

                    {/* Product / release count */}
                    <Table.Cell>
                      <Badge size="2xsmall" color={h.product_count ? "blue" : "grey"}>
                        {h.product_count} {h.product_count === 1 ? "release" : "releases"}
                      </Badge>
                    </Table.Cell>

                    {/* Active toggle — stop propagation so row click doesn't open edit */}
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={h.is_active}
                        disabled={togglingId === h.id}
                        onCheckedChange={() => toggleActive(h)}
                      />
                    </Table.Cell>

                    {/* Actions */}
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="small" onClick={() => openEdit(h)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="small" onClick={() => handleDelete(h)}>
                          Deactivate
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
              {hops.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={7}>
                    <div className="text-center text-ui-fg-subtle py-8">No hops yet.</div>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        )}
      </div>

      {/* Create / Edit modal */}
      <FocusModal open={mode !== null} onOpenChange={(o) => !o && close()}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Text weight="plus">{mode === "create" ? "New hop" : "Edit hop"}</Text>
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
                {mode === "create" ? "Create hop" : "Save changes"}
              </Button>
            </div>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <HopFields form={form} set={set} slugTaken={slugTaken} showActive={mode === "edit"} />
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Hops",
})

export default HopsPage
