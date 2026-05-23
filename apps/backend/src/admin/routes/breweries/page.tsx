import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Table, Button, Input, Label, Drawer } from "@medusajs/ui"
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
  instagram_url: string | null
  is_active: boolean
}

function ImageUpload({
  label,
  currentUrl,
  onUploaded,
}: {
  label: string
  currentUrl: string | null
  onUploaded: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPreview(currentUrl)
  }, [currentUrl])

  const handleFile = async (file: File) => {
    setUploading(true)
    setUploadStatus("idle")
    try {
      const data = await sdk.admin.upload.create({ files: [file] })
      const url = data.files?.[0]?.url
      if (url) {
        setPreview(url)
        onUploaded(url)
        setUploadStatus("success")
        setTimeout(() => setUploadStatus("idle"), 3000)
      } else {
        throw new Error("No URL in response")
      }
    } catch (err) {
      console.error("Image upload error:", err)
      setUploadStatus("error")
      setTimeout(() => setUploadStatus("idle"), 3000)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {preview && (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-ui-border-base">
          <img src={preview} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => { setPreview(null); onUploaded("") }}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
          >
            ×
          </button>
        </div>
      )}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-ui-border-base rounded-lg p-4 text-center cursor-pointer hover:border-ui-fg-interactive transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        {uploading ? (
          <span className="text-ui-fg-muted text-sm">Uploading...</span>
        ) : uploadStatus === "success" ? (
          <span className="text-ui-fg-interactive text-sm font-medium">✓ Image uploaded successfully</span>
        ) : uploadStatus === "error" ? (
          <span className="text-ui-fg-error text-sm font-medium">✗ Upload failed — try again</span>
        ) : (
          <span className="text-ui-fg-muted text-sm">
            {preview ? "Click to replace image" : "Click to upload image"}
          </span>
        )}
      </div>
    </div>
  )
}

const BreweriesPage = () => {
  const [breweries, setBreweries] = useState<Brewery[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editBrewery, setEditBrewery] = useState<Brewery | null>(null)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [location, setLocation] = useState("")
  const [createHeroUrl, setCreateHeroUrl] = useState("")

  const [editName, setEditName] = useState("")
  const [editSlug, setEditSlug] = useState("")
  const [editLocation, setEditLocation] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editHeroUrl, setEditHeroUrl] = useState("")
  const [editWebsite, setEditWebsite] = useState("")
  const [editInstagram, setEditInstagram] = useState("")
  const [editUntappd, setEditUntappd] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const loadBreweries = () => {
    sdk.client.fetch<{ breweries: Brewery[] }>("/admin/breweries")
      .then((data) => setBreweries(data.breweries || []))
  }

  useEffect(() => { loadBreweries() }, [])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await sdk.client.fetch(`/admin/breweries/${id}`, { method: "DELETE" })
      setConfirmDeleteId(null)
      loadBreweries()
    } catch (err: any) {
      alert(`Delete failed: ${err?.message || String(err)}`)
    } finally {
      setDeletingId(null)
    }
  }

  const openEdit = (b: Brewery) => {
    setEditBrewery(b)
    setEditName(b.name)
    setEditSlug(b.slug)
    setEditLocation(b.location || "")
    setEditDescription(b.description || "")
    setEditHeroUrl(b.hero_image_url || "")
    setEditWebsite(b.website_url || "")
    setEditInstagram(b.instagram_url || "")
    setEditUntappd(b.untappd_url || "")
  }

  const handleCreate = async () => {
    await sdk.client.fetch("/admin/breweries", {
      method: "POST",
      body: {
        name,
        slug,
        location,
        hero_image_url: createHeroUrl || undefined,
      },
    })
    setName("")
    setSlug("")
    setLocation("")
    setCreateHeroUrl("")
    setShowForm(false)
    loadBreweries()
  }

  const handleSaveEdit = async () => {
    if (!editBrewery) return
    setSaving(true)
    try {
      const body: Record<string, any> = {
        name: editName,
        slug: editSlug,
      }
      if (editLocation) body.location = editLocation
      if (editDescription) body.description = editDescription
      if (editHeroUrl) body.hero_image_url = editHeroUrl
      if (editWebsite) body.website_url = editWebsite
      if (editInstagram) body.instagram_url = editInstagram
      if (editUntappd) body.untappd_url = editUntappd

      await sdk.client.fetch(`/admin/breweries/${editBrewery.id}`, {
        method: "POST",
        body,
      })
      setEditBrewery(null)
      loadBreweries()
    } catch (err: any) {
      const msg = err?.body?.message || err?.message || String(err)
      console.error("Save failed:", err)
      alert(`Save failed: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container>
      <div className="flex justify-between items-center mb-4">
        <Heading level="h1">Breweries</Heading>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Brewery"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 border border-ui-border-base rounded-lg space-y-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <ImageUpload
            label="Hero Image"
            currentUrl={createHeroUrl || null}
            onUploaded={setCreateHeroUrl}
          />
          <Button onClick={handleCreate}>Create</Button>
        </div>
      )}

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Slug</Table.HeaderCell>
            <Table.HeaderCell>Location</Table.HeaderCell>
            <Table.HeaderCell>Hero</Table.HeaderCell>
            <Table.HeaderCell>Active</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {breweries.map((b) => (
            <Table.Row key={b.id}>
              <Table.Cell>{b.name}</Table.Cell>
              <Table.Cell>{b.slug}</Table.Cell>
              <Table.Cell>{b.location || "—"}</Table.Cell>
              <Table.Cell>
                {b.hero_image_url ? (
                  <img src={b.hero_image_url} alt="" className="w-10 h-10 rounded object-cover" />
                ) : (
                  <span className="text-ui-fg-muted">—</span>
                )}
              </Table.Cell>
              <Table.Cell>{b.is_active ? "Yes" : "No"}</Table.Cell>
              <Table.Cell>
                <div className="flex gap-2">
                  <Button variant="secondary" size="small" onClick={() => openEdit(b)}>
                    Edit
                  </Button>
                  {confirmDeleteId === b.id ? (
                    <>
                      <Button
                        variant="danger"
                        size="small"
                        isLoading={deletingId === b.id}
                        onClick={() => handleDelete(b.id)}
                      >
                        Confirm
                      </Button>
                      <Button variant="secondary" size="small" onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button variant="danger" size="small" onClick={() => setConfirmDeleteId(b.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      <Drawer open={!!editBrewery} onOpenChange={(open) => { if (!open) setEditBrewery(null) }}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit Brewery</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="space-y-4 overflow-y-auto">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Slug</Label>
              <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <ImageUpload
              label="Hero Image"
              currentUrl={editHeroUrl || null}
              onUploaded={setEditHeroUrl}
            />
            <div className="space-y-1">
              <Label>Website URL</Label>
              <Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Instagram URL</Label>
              <Input value={editInstagram} onChange={(e) => setEditInstagram(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Untappd URL</Label>
              <Input value={editUntappd} onChange={(e) => setEditUntappd(e.target.value)} />
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Button variant="secondary" onClick={() => setEditBrewery(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} isLoading={saving}>Save Changes</Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Breweries",
})

export default BreweriesPage
